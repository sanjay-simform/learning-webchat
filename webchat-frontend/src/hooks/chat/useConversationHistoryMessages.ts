import { useEffect, useState } from "react";
import type { ConversationSummaryDto } from "../../api-client/services/conversation/conversation.service.dto";
import { useMessages } from "../../api-client/services/messages/messages.service";
import type { MessageItemDto } from "../../api-client/services/messages/messages.service.dto";
import type { AuthUser } from "../../types/auth";
import type { Message } from "../../types/chat";
import { decryptMessageWithConversationKey } from "../../utils/crypto-utils";

interface UseConversationHistoryMessagesResult {
  messages: Message[];
  isLoading: boolean;
}

function toReadableMessage(
  item: MessageItemDto,
  conversationId: string,
  currentUser: AuthUser | null,
  peerUsername: string,
  content: string,
): Message {
  const isCurrentUser = item.senderUserId === currentUser?.id;

  return {
    id: item.id,
    conversationId,
    senderId: item.senderUserId,
    senderUsername: isCurrentUser
      ? (currentUser?.username ?? "You")
      : peerUsername,
    content,
    encryptedPayload: {
      cipherText: item.cipherText,
      iv: item.iv,
      authTag: item.authTag,
    },
    timestamp: new Date(item.createdAt),
    status: isCurrentUser ? "delivered" : undefined,
  };
}

export function useConversationHistoryMessages(
  conversation: ConversationSummaryDto | null,
  conversationKey: string | null,
  currentUser: AuthUser | null,
): UseConversationHistoryMessagesResult {
  const [messages, setMessages] = useState<Message[]>([]);
  const messagesQuery = useMessages(conversation?.id ?? "", { limit: 50 });

  useEffect(() => {
    if (!conversation) {
      setMessages([]);
      return;
    }

    const items = messagesQuery.data?.data?.items;
    if (!conversationKey || !items) {
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const reversedItems = [...items].reverse();
        const decryptedMessages = await Promise.all(
          reversedItems.map(async (item) => {
            const content = await decryptMessageWithConversationKey(
              conversationKey,
              {
                cipherText: item.cipherText,
                iv: item.iv,
                authTag: item.authTag,
              },
            );

            return toReadableMessage(
              item,
              conversation.id,
              currentUser,
              conversation.peer.username,
              content,
            );
          }),
        );

        if (!cancelled) {
          setMessages(decryptedMessages);
        }
      } catch {
        if (!cancelled) {
          setMessages([]);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    conversation,
    conversationKey,
    currentUser,
    messagesQuery.data?.data?.items,
  ]);

  return {
    messages,
    isLoading:
      !conversation ||
      !conversationKey ||
      messagesQuery.isLoading ||
      messagesQuery.isFetching,
  };
}
