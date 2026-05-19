import { useEffect, useMemo, useRef } from "react";
import { motion } from "motion/react";
import type { Chat } from "../../../types/chat";
import { ChatListItem } from "./ChatListItem";
import { LoadingSpinner } from "../../../components/LoadingSpinner";
import type { ConversationSummaryDto } from "../../../api-client/services/conversation/conversation.service.dto";
import { useListVirtualizer } from "../../../hooks/useListVirtualizer.ts";

interface ChatListSidebarProps {
  conversations: ConversationSummaryDto[];
  selectedChat: Chat | null;
  onSelectConversation: (conversation: ConversationSummaryDto) => void;
  onNewChatClick: () => void;
  searchQuery: string;
  isLoading: boolean;
  unreadCounts?: Record<string, number>;
}

export const ChatListSidebar = ({
  conversations,
  selectedChat,
  onSelectConversation,
  onNewChatClick,
  searchQuery,
  isLoading,
  unreadCounts = {},
}: ChatListSidebarProps) => {
  "use no memo";

  const scrollParentRef = useRef<HTMLDivElement>(null);

  const filteredConversations = useMemo(() => {
    if (searchQuery.trim() === "") {
      return conversations;
    }

    const query = searchQuery.toLowerCase();
    return conversations.filter(
      (conversation) =>
        conversation.peer.username.toLowerCase().includes(query) ||
        conversation.peer.id.toLowerCase().includes(query),
    );
  }, [conversations, searchQuery]);

  const conversationVirtualizer = useListVirtualizer({
    count: filteredConversations.length,
    getScrollElement: () => scrollParentRef.current,
    estimateSize: () => 88,
    overscan: 8,
    getItemKey: (index) => filteredConversations[index]?.id ?? index,
  });

  const virtualItems = conversationVirtualizer.getVirtualItems();

  return (
    <div className="flex flex-col h-full bg-sidebar border-r border-obsidian-500 border-opacity-40">
      {/* New Chat Button */}
      <div className="p-4 border-b border-obsidian-500 border-opacity-40">
        <button
          type="button"
          onClick={onNewChatClick}
          className="w-full btn-primary py-2.5 text-sm font-medium rounded-lg transition-colors"
        >
          + New Chat
        </button>
      </div>

      {/* Chat List */}
      <div ref={scrollParentRef} className="flex-1 overflow-y-auto px-2 py-2">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <LoadingSpinner />
          </div>
        ) : filteredConversations.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 text-center"
          >
            <svg
              className="w-12 h-12 mx-auto mb-3 text-text-muted opacity-50"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
            <p className="text-sm text-text-secondary">No chats found</p>
            {searchQuery && (
              <p className="text-xs text-text-muted mt-1">
                Try a different search term
              </p>
            )}
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div
              className="relative w-full"
              style={{ height: `${conversationVirtualizer.getTotalSize()}px` }}
            >
              {virtualItems.map((virtualItem) => {
                const conversation = filteredConversations[virtualItem.index];

                return (
                  <div
                    key={virtualItem.key}
                    ref={conversationVirtualizer.measureElement}
                    data-index={virtualItem.index}
                    className="absolute left-0 top-0 w-full"
                    style={{
                      transform: `translateY(${virtualItem.start}px)`,
                    }}
                  >
                    <ChatListItem
                      conversation={conversation}
                      isSelected={selectedChat?.id === conversation.id}
                      onClick={() => onSelectConversation(conversation)}
                      unreadCount={unreadCounts[conversation.id] ?? 0}
                    />
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};
