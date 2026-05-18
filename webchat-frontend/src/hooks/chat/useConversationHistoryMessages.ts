import { useEffect, useRef, useState } from "react";
import type { ConversationSummaryDto } from "../../api-client/services/conversation/conversation.service.dto";
import type { MessageItemDto } from "../../api-client/services/messages/messages.service.dto";
import type { AuthUser } from "../../types/auth";
import { MessageStatus, type Message } from "../../types/chat";
import { decryptMessageWithConversationKey } from "../../utils/crypto-utils";
import { useInfiniteMessages } from "../../api-client/services/messages/messages.service";
import { UPLOAD_BASE_URL } from "../../api-client/api-client";
import { decryptImage } from "../../utils/image-enc.util";

/**
 * Decrypt media from server and create blob URL
 */
async function decryptAndBlobifyMedia(
  mediaUrl: string,
  conversationKey: string,
  iv: string,
): Promise<string> {
  // Fetch encrypted media
  const response = await fetch(mediaUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch media: ${response.statusText}`);
  }

  const encryptedBuffer = await response.arrayBuffer();
  const decimage = await decryptImage(encryptedBuffer, conversationKey, iv);
  return URL.createObjectURL(decimage);
}

interface UseConversationHistoryMessagesResult {
  messages: Message[];
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  loadMore: () => Promise<unknown>;
}

function toReadableMessage(
  item: MessageItemDto,
  conversationId: string,
  currentUser: AuthUser | null,
  peerUsername: string,
  content: string,
  imgUrl?: string,
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
    imgUrl,
    encryptedPayload: {
      cipherText: item.cipherText,
      iv: item.iv,
      authTag: item.authTag,
    },
    timestamp: new Date(item.createdAt),
    status:
      item.status ?? (isCurrentUser ? MessageStatus.DELIVERED : undefined),
    payload: item.payload,
  };
}

export function useConversationHistoryMessages(
  conversation: ConversationSummaryDto | null,
  conversationKey: string | null,
  currentUser: AuthUser | null,
): UseConversationHistoryMessagesResult {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isHydratingMessages, setIsHydratingMessages] = useState(false);
  const hydrationRequestRef = useRef(0);
  const messagesQuery = useInfiniteMessages(conversation?.id ?? "", {
    limit: 50,
  });

  useEffect(() => {
    if (!conversation) {
      setMessages([]);
      setIsHydratingMessages(false);
      return;
    }

    const pages = messagesQuery.data?.pages ?? [];
    const items = pages.flatMap((page) => page.data?.items ?? []);
    if (!conversationKey || items.length === 0) {
      return;
    }

    let cancelled = false;
    const requestId = ++hydrationRequestRef.current;

    setIsHydratingMessages(true);

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
            let imageUrl: string | undefined;
            if (item?.payload?.mediaUrl) {
              try {
                imageUrl = await decryptAndBlobifyMedia(
                  UPLOAD_BASE_URL + item.payload.mediaUrl,
                  conversationKey,
                  item?.payload.iv,
                );
              } catch (error) {
                console.error("Failed to decrypt media:", error);
              }
            }
            return toReadableMessage(
              item,
              conversation.id,
              currentUser,
              conversation.peer.username,
              content,
              imageUrl,
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
      } finally {
        if (!cancelled && hydrationRequestRef.current === requestId) {
          setIsHydratingMessages(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [conversation, conversationKey, currentUser, messagesQuery.data?.pages]);

  return {
    messages,
    isLoading:
      !conversation ||
      !conversationKey ||
      (messagesQuery.isLoading && messages.length === 0) ||
      (isHydratingMessages && messages.length === 0),
    isLoadingMore:
      messagesQuery.isFetchingNextPage ||
      (isHydratingMessages && messages.length > 0),
    hasMore: Boolean(messagesQuery.hasNextPage),
    loadMore: messagesQuery.fetchNextPage,
  };
}
