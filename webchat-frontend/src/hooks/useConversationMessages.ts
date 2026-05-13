import { useCallback, useEffect, useReducer } from "react";
import type { ConversationSummaryDto } from "../api-client/services/conversation/conversation.service.dto";
import { useAuth } from "../context/AuthContext";
import type { Message } from "../types/chat";
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

interface UseConversationMessagesResult {
  messages: Message[];
  isLoading: boolean;
  isSending: boolean;
  sendMessage: (content: string) => Promise<void>;
}

interface DeliveryAckEvent {
  messageId: string;
  clientMsgId: string | null;
  status: "delivered" | "stored";
}

export function useConversationMessages(
  conversation: ConversationSummaryDto | null,
): UseConversationMessagesResult {
  const { user, decryptedData } = useAuth();
  const [messages, dispatch] = useReducer(
    conversationMessagesReducer,
    [] as Message[],
  );

  const { conversationKey, isDecrypting } = useConversationKey(
    conversation,
    decryptedData?.rsaPrivateKey,
  );

  const { messages: historyMessages, isLoading: isHistoryLoading } =
    useConversationHistoryMessages(conversation, conversationKey, user);

  useEffect(() => {
    dispatch({ type: "reset" });
  }, [conversation?.id]);

  useEffect(() => {
    if (historyMessages.length > 0) {
      dispatch({ type: "hydrate", messages: historyMessages });
    }
  }, [historyMessages]);

  const handleIncomingMessage = useCallback((message: Message) => {
    dispatch({ type: "upsert", message });
  }, []);

  const handleDeliveryAck = useCallback((event: DeliveryAckEvent) => {
    dispatch({
      type: "patch",
      patch: createDeliveryPatch({
        clientMsgId: event.clientMsgId,
        messageId: event.messageId,
        status: event.status,
      }),
    });
  }, []);

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

  return {
    messages,
    isLoading: !conversation || isDecrypting || isHistoryLoading,
    isSending,
    sendMessage,
  };
}
