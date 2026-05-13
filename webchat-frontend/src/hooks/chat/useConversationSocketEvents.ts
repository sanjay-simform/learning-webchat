import { useEffect } from "react";
import { useSocket } from "../../context/SocketContext";
import type { AuthUser } from "../../types/auth";
import type { Message } from "../../types/chat";
import { decryptMessageWithConversationKey } from "../../utils/crypto-utils";
import type {
  MessageDeliveryAckEvent,
  OutboundChatMessageEvent,
} from "./chat-event.types";

interface UseConversationSocketEventsOptions {
  conversationId: string | null;
  conversationKey: string | null;
  currentUser: AuthUser | null;
  peerUsername: string;
  onIncomingMessage: (message: Message) => void;
  onDeliveryAck: (event: MessageDeliveryAckEvent) => void;
}

export function useConversationSocketEvents({
  conversationId,
  conversationKey,
  currentUser,
  peerUsername,
  onIncomingMessage,
  onDeliveryAck,
}: UseConversationSocketEventsOptions): void {
  const { onEvent } = useSocket();

  useEffect(() => {
    if (!conversationId || !conversationKey) {
      return;
    }

    const unsubscribeNewMessage = onEvent("new_message", (payload) => {
      const event = payload as OutboundChatMessageEvent;

      if (event.conversationId !== conversationId) {
        return;
      }

      void (async () => {
        try {
          const content = await decryptMessageWithConversationKey(
            conversationKey,
            {
              cipherText: event.cipherText,
              iv: event.iv,
              authTag: event.authTag,
            },
          );

          const isCurrentUser = event.senderUserId === currentUser?.id;
          onIncomingMessage({
            id: event.messageId,
            conversationId: event.conversationId,
            senderId: event.senderUserId,
            senderUsername: isCurrentUser
              ? (currentUser?.username ?? "You")
              : peerUsername || "Unknown user",
            content,
            encryptedPayload: {
              cipherText: event.cipherText,
              iv: event.iv,
              authTag: event.authTag,
            },
            timestamp: new Date(event.createdAt),
            clientMsgId: event.clientMsgId ?? undefined,
          });
        } catch {
          // Ignore malformed payloads.
        }
      })();
    });

    const unsubscribeDeliveryAck = onEvent("message_delivery", (payload) => {
      const event = payload as MessageDeliveryAckEvent;

      if (event.conversationId !== conversationId) {
        return;
      }

      if (event.senderUserId !== currentUser?.id) {
        return;
      }

      onDeliveryAck(event);
    });

    return () => {
      unsubscribeNewMessage();
      unsubscribeDeliveryAck();
    };
  }, [
    conversationId,
    conversationKey,
    currentUser,
    peerUsername,
    onDeliveryAck,
    onEvent,
    onIncomingMessage,
  ]);
}
