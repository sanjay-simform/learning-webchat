import { useCallback, useEffect, useRef, useState } from "react";
import { useSocket } from "../../context/SocketContext";
import type { AuthUser } from "../../types/auth";
import type { Message } from "../../types/chat";
import { encryptMessageWithConversationKey } from "../../utils/crypto-utils";
import type { MessageQueuedEvent } from "./chat-event.types";

interface UseConversationMessageSenderOptions {
  conversationId: string | null;
  conversationKey: string | null;
  currentUser: AuthUser | null;
  onOptimisticMessage: (message: Message) => void;
  onQueued: (clientMsgId: string) => void;
  onFailed: (clientMsgId: string) => void;
}

interface PendingMessageAck {
  resolve: () => void;
  reject: (error: Error) => void;
  timeoutId: number;
}

interface UseConversationMessageSenderResult {
  sendMessage: (content: string) => Promise<void>;
  isSending: boolean;
}

function createClientMessageId(): string {
  return (
    globalThis.crypto?.randomUUID?.() ?? `client-${Date.now()}-${Math.random()}`
  );
}

export function useConversationMessageSender({
  conversationId,
  conversationKey,
  currentUser,
  onOptimisticMessage,
  onQueued,
  onFailed,
}: UseConversationMessageSenderOptions): UseConversationMessageSenderResult {
  const { isConnected, sendEvent, onEvent } = useSocket();
  const [isSending, setIsSending] = useState(false);
  const pendingAcksRef = useRef(new Map<string, PendingMessageAck>());

  useEffect(() => {
    const pendingAcks = pendingAcksRef.current;

    const unsubscribeQueued = onEvent("message_queued", (payload) => {
      const event = payload as MessageQueuedEvent;

      if (!event.clientMsgId) {
        return;
      }

      const pendingAck = pendingAcks.get(event.clientMsgId);
      if (!pendingAck) {
        return;
      }

      window.clearTimeout(pendingAck.timeoutId);
      pendingAcks.delete(event.clientMsgId);
      pendingAck.resolve();
      onQueued(event.clientMsgId);
    });

    return () => {
      unsubscribeQueued();

      for (const pendingAck of pendingAcks.values()) {
        window.clearTimeout(pendingAck.timeoutId);
      }
      pendingAcks.clear();
      setIsSending(false);
    };
  }, [conversationId, onEvent, onQueued]);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!conversationId || !conversationKey || !currentUser) {
        throw new Error("Conversation is not ready yet");
      }

      if (!isConnected) {
        throw new Error("Chat connection is offline");
      }

      const clientMsgId = createClientMessageId();
      const encryptedPayload = await encryptMessageWithConversationKey(
        conversationKey,
        content,
      );

      onOptimisticMessage({
        id: clientMsgId,
        conversationId,
        senderId: currentUser.id,
        senderUsername: currentUser.username,
        content,
        encryptedPayload,
        timestamp: new Date(),
        status: "pending",
        clientMsgId,
      });

      setIsSending(true);

      const ackPromise = new Promise<void>((resolve, reject) => {
        const timeoutId = window.setTimeout(() => {
          pendingAcksRef.current.delete(clientMsgId);
          onFailed(clientMsgId);
          reject(new Error("Message queue timed out"));
        }, 10000);

        pendingAcksRef.current.set(clientMsgId, {
          resolve,
          reject,
          timeoutId,
        });
      });

      try {
        sendEvent("send_message", {
          conversationId,
          clientMsgId,
          ...encryptedPayload,
        });

        await ackPromise;
      } catch (error) {
        const pendingAck = pendingAcksRef.current.get(clientMsgId);
        if (pendingAck) {
          window.clearTimeout(pendingAck.timeoutId);
          pendingAcksRef.current.delete(clientMsgId);
        }

        onFailed(clientMsgId);
        throw error instanceof Error
          ? error
          : new Error("Failed to send message");
      } finally {
        setIsSending(false);
      }
    },
    [
      conversationId,
      conversationKey,
      currentUser,
      isConnected,
      onFailed,
      onOptimisticMessage,
      sendEvent,
    ],
  );

  return {
    sendMessage,
    isSending,
  };
}
