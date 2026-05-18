import { useEffect } from "react";
import { useSocket } from "../../context/SocketContext";
import type { AuthUser } from "../../types/auth";
import { MessageStatus, type Message } from "../../types/chat";
import { decryptMessageWithConversationKey } from "../../utils/crypto-utils";
import { decryptImage } from "../../utils/image-enc.util";
import { UPLOAD_BASE_URL } from "../../api-client/api-client";
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

          // Decrypt image if payload contains media
          let imgUrl: string | undefined;
          const eventPayload = event.payload;
          if (eventPayload?.mediaUrl && eventPayload.iv) {
            try {
              const encryptedImageResponse = await fetch(
                UPLOAD_BASE_URL + eventPayload.mediaUrl,
              );
              if (encryptedImageResponse.ok) {
                const encryptedBuffer =
                  await encryptedImageResponse.arrayBuffer();
                const decryptedImageBlob = await decryptImage(
                  encryptedBuffer,
                  conversationKey,
                  eventPayload.iv,
                );
                imgUrl = URL.createObjectURL(decryptedImageBlob);
              }
            } catch (error) {
              console.error("Failed to decrypt incoming message media:", error);
            }
          }

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
            status: MessageStatus.DELIVERED,
            payload: event.payload,
            imgUrl,
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
