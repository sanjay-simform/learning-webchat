import { useCallback, useEffect, useReducer, useRef } from "react";
import type { ConversationSummaryDto } from "../api-client/services/conversation/conversation.service.dto";
import { useAuth } from "../context/AuthContext";
import {
  MessageStatus,
  type Message,
  type MessagePayload,
} from "../types/chat";
import { useSocket } from "../context/SocketContext";
import { useConversationHistoryMessages } from "./chat/useConversationHistoryMessages";
import { useConversationKey } from "./chat/useConversationKey";
import { useConversationMessageSender } from "./chat/useConversationMessageSender";
import { useConversationSocketEvents } from "./chat/useConversationSocketEvents";
import {
  conversationMessagesReducer,
  createDeliveryPatch,
  createFailedPatch,
  createQueuedPatch,
} from "./chat/conversation-message.reducer";
import { decryptImage } from "../utils/image-enc.util";
import { UPLOAD_BASE_URL } from "../api-client/api-client";

interface UseConversationMessagesResult {
  messages: Message[];
  isLoading: boolean;
  isSending: boolean;
  isLoadingMoreMessages: boolean;
  hasMoreMessages: boolean;
  loadMoreMessages: () => Promise<unknown>;
  sendMessage: (
    content: string,
    payload: Partial<MessagePayload>,
  ) => Promise<void>;
  getEncryptionKeyForMessage: () => string | null;
}

interface DeliveryAckEvent {
  messageId: string;
  clientMsgId: string | null;
  status: MessageStatus;
  payload?: MessagePayload;
}

export function useConversationMessages(
  conversation: ConversationSummaryDto | null,
): UseConversationMessagesResult {
  const { user, decryptedData } = useAuth();
  const { isConnected, sendEvent } = useSocket();
  const [messages, dispatch] = useReducer(
    conversationMessagesReducer,
    [] as Message[],
  );
  const deliveredMessageIdsRef = useRef(new Set<string>());
  const seenMessageIdsRef = useRef(new Set<string>());

  const { conversationKey, isDecrypting } = useConversationKey(
    conversation,
    decryptedData?.rsaPrivateKey,
  );

  const {
    messages: historyMessages,
    isLoading: isHistoryLoading,
    isLoadingMore: isHistoryLoadingMore,
    hasMore: hasHistoryMore,
    loadMore: loadMoreHistoryMessages,
  } = useConversationHistoryMessages(conversation, conversationKey, user);

  useEffect(() => {
    dispatch({ type: "reset" });
    deliveredMessageIdsRef.current.clear();
    seenMessageIdsRef.current.clear();
  }, [conversation?.id]);

  useEffect(() => {
    if (historyMessages.length > 0) {
      dispatch({ type: "hydrate", messages: historyMessages });
    }
  }, [historyMessages]);

  useEffect(() => {
    if (
      !conversation?.id ||
      !conversationKey ||
      !user?.id ||
      isDecrypting ||
      isHistoryLoading ||
      !isConnected
    ) {
      return;
    }

    const deliveredMessageIds = messages
      .filter((message) => message.conversationId === conversation.id)
      .filter((message) => message.senderId !== user.id)
      .filter(
        (message) =>
          message.status !== MessageStatus.DELIVERED &&
          message.status !== MessageStatus.SEEN &&
          message.status !== MessageStatus.FAILED,
      )
      .map((message) => message.id)
      .filter((messageId) => !deliveredMessageIdsRef.current.has(messageId));

    if (deliveredMessageIds.length === 0) {
      return;
    }

    for (const messageId of deliveredMessageIds) {
      deliveredMessageIdsRef.current.add(messageId);
    }

    try {
      sendEvent("mark_messages_delivered", {
        messageIds: deliveredMessageIds,
      });

      for (const messageId of deliveredMessageIds) {
        dispatch({
          type: "patch",
          patch: createDeliveryPatch({
            messageId,
            status: MessageStatus.DELIVERED,
          }),
        });
      }
    } catch {
      for (const messageId of deliveredMessageIds) {
        deliveredMessageIdsRef.current.delete(messageId);
      }
    }
  }, [
    conversation?.id,
    conversationKey,
    isConnected,
    isDecrypting,
    isHistoryLoading,
    messages,
    sendEvent,
    user?.id,
  ]);

  useEffect(() => {
    if (
      !conversation?.id ||
      !conversationKey ||
      !user?.id ||
      isDecrypting ||
      isHistoryLoading ||
      !isConnected
    ) {
      return;
    }

    const seenMessageIds = messages
      .filter((message) => message.conversationId === conversation.id)
      .filter((message) => message.senderId !== user.id)
      .filter((message) => message.status === MessageStatus.DELIVERED)
      .map((message) => message.id)
      .filter((messageId) => !seenMessageIdsRef.current.has(messageId));

    if (seenMessageIds.length === 0) {
      return;
    }

    for (const messageId of seenMessageIds) {
      seenMessageIdsRef.current.add(messageId);
    }

    try {
      sendEvent("mark_messages_seen", {
        messageIds: seenMessageIds,
      });
    } catch {
      for (const messageId of seenMessageIds) {
        seenMessageIdsRef.current.delete(messageId);
      }
    }
  }, [
    conversation?.id,
    conversationKey,
    isConnected,
    isDecrypting,
    isHistoryLoading,
    messages,
    sendEvent,
    user?.id,
  ]);

  const handleIncomingMessage = useCallback((message: Message) => {
    dispatch({ type: "upsert", message });
  }, []);

  const handleDeliveryAck = useCallback(
    (event: DeliveryAckEvent) => {
      dispatch({
        type: "patch",
        patch: createDeliveryPatch({
          clientMsgId: event.clientMsgId,
          messageId: event.messageId,
          status: event.status,
          payload: event.payload,
        }),
      });

      // Decrypt and update image if payload contains media
      const payload = event.payload;
      if (payload?.mediaUrl && conversationKey && payload.iv) {
        void (async () => {
          try {
            const mediaUrl = payload.mediaUrl;
            const iv = payload.iv;

            const imageUrl = await decryptImage(
              await fetch(UPLOAD_BASE_URL + mediaUrl).then((r) =>
                r.arrayBuffer(),
              ),
              conversationKey,
              iv as string,
            );
            const blobUrl = URL.createObjectURL(imageUrl);

            dispatch({
              type: "patch",
              patch: createDeliveryPatch({
                messageId: event.messageId,
                status: event.status,
                payload: event.payload,
                imgUrl: blobUrl,
              }),
            });
          } catch (error) {
            console.error("Failed to decrypt delivery ack media:", error);
          }
        })();
      }
    },
    [conversationKey],
  );

  const handleOptimisticMessage = useCallback((message: Message) => {
    dispatch({ type: "upsert", message });
  }, []);

  const handleQueued = useCallback((clientMsgId: string) => {
    dispatch({
      type: "patch",
      patch: createQueuedPatch(clientMsgId),
    });
  }, []);

  const handleFailed = useCallback((clientMsgId: string) => {
    dispatch({
      type: "patch",
      patch: createFailedPatch(clientMsgId),
    });
  }, []);

  useConversationSocketEvents({
    conversationId: conversation?.id ?? null,
    conversationKey,
    currentUser: user,
    peerUsername: conversation?.peer.username ?? "",
    onIncomingMessage: handleIncomingMessage,
    onDeliveryAck: handleDeliveryAck,
  });

  const { sendMessage, isSending } = useConversationMessageSender({
    conversationId: conversation?.id ?? null,
    conversationKey,
    currentUser: user,
    onOptimisticMessage: handleOptimisticMessage,
    onQueued: handleQueued,
    onFailed: handleFailed,
  });
  const getEncryptionKeyForMessage = useCallback(() => {
    return conversationKey;
  }, [conversationKey]);

  return {
    messages,
    isLoading: !conversation || isDecrypting || isHistoryLoading,
    isSending,
    isLoadingMoreMessages: isHistoryLoadingMore,
    hasMoreMessages: hasHistoryMore,
    loadMoreMessages: loadMoreHistoryMessages,
    sendMessage,
    getEncryptionKeyForMessage,
  };
}
