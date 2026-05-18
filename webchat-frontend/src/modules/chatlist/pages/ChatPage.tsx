import { useState } from "react";
import { motion } from "motion/react";
import { MainLayout } from "../../../layouts/MainLayout";
import {
  TopBar,
  ChatListSidebar,
  ChatPanel,
  NewChatModal,
} from "../components";
import type { Chat } from "../../../types/chat";
import { useConversations } from "../../../api-client/services/conversation/conversation.service";
import type { ConversationSummaryDto } from "../../../api-client/services/conversation/conversation.service.dto";
import { useAuth } from "../../../context/AuthContext";
import { useConversationMessages } from "../../../hooks/useConversationMessages";
import { useConversationMemberEvent } from "../../../hooks/conversation/useConversationMember";
import { useToast, ToastContainer } from "../../../components/Toast";

const mapConversationToChat = (conversation: ConversationSummaryDto): Chat => ({
  id: conversation.id,
  userId: conversation.peer.id,
  username: conversation.peer.username,
});

export const ChatPage = () => {
  const { user } = useAuth();
  const [selectedConversation, setSelectedConversation] =
    useState<ConversationSummaryDto | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);

  const { toasts, addToast, removeToast } = useToast();

  // Listen for conversation invitation events
  useConversationMemberEvent((username: string) => {
    addToast(`${username} started a conversation with you`, "info", 5000);
  });

  const conversationsQuery = useConversations();
  const conversations = conversationsQuery.data?.data ?? [];
  const selectedChat = selectedConversation
    ? mapConversationToChat(selectedConversation)
    : null;
  const conversationMessages = useConversationMessages(selectedConversation);

  const handleSelectConversation = (conversation: ConversationSummaryDto) => {
    setSelectedConversation(conversation);
    setIsMobileMenuOpen(false);
  };

  const handleConversationCreated = (conversation: ConversationSummaryDto) => {
    setSelectedConversation(conversation);
    setIsNewChatModalOpen(false);
    setIsMobileMenuOpen(false);
  };

  return (
    <MainLayout>
      {/* Sidebar */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
        className={`
          hidden md:flex flex-col w-80 bg-sidebar border-r border-obsidian-500 border-opacity-30
          shrink-0
        `}
      >
        <div className="flex flex-col h-full">
          <TopBar onSearchChange={setSearchQuery} />
          <ChatListSidebar
            conversations={conversations}
            selectedChat={selectedChat}
            onSelectConversation={handleSelectConversation}
            onNewChatClick={() => setIsNewChatModalOpen(true)}
            searchQuery={searchQuery}
            isLoading={conversationsQuery.isLoading}
          />
        </div>
      </motion.div>

      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setIsMobileMenuOpen(false)}
          className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
        />
      )}

      {/* Mobile Sidebar */}
      <motion.div
        initial={{ x: "-100%" }}
        animate={{ x: isMobileMenuOpen ? 0 : "-100%" }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className={`
          md:hidden fixed left-0 top-0 bottom-0 w-72 bg-sidebar z-40
          flex flex-col border-r border-obsidian-500 border-opacity-30
        `}
      >
        <TopBar onSearchChange={setSearchQuery} />
        <ChatListSidebar
          conversations={conversations}
          selectedChat={selectedChat}
          onSelectConversation={handleSelectConversation}
          onNewChatClick={() => setIsNewChatModalOpen(true)}
          searchQuery={searchQuery}
          isLoading={conversationsQuery.isLoading}
        />
      </motion.div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header */}
        <div className="md:hidden h-16 px-4 flex items-center justify-between bg-base border-b border-obsidian-500 border-opacity-30 sticky top-0 z-20">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 hover:bg-elevated rounded-lg transition-colors"
          >
            <svg
              className="w-5 h-5 text-text-secondary"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
          {selectedChat && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-linear-to-br from-accent-cyan via-accent-violet to-accent-rose bg-opacity-20 flex items-center justify-center">
                <span className="text-xs font-semibold text-accent-cyan">
                  {selectedChat.username?.charAt(0).toUpperCase()}
                </span>
              </div>
              <span className="text-sm font-medium text-primary">
                {selectedChat.username}
              </span>
            </div>
          )}
          <div className="w-10 shrink-0" />
        </div>

        {/* Chat Panel */}
        <ChatPanel
          conversationMessageKey={
            conversationMessages.getEncryptionKeyForMessage
          }
          chat={selectedChat}
          messages={conversationMessages.messages}
          isLoading={
            conversationMessages.isLoading || conversationsQuery.isLoading
          }
          isLoadingMoreMessages={conversationMessages.isLoadingMoreMessages}
          hasMoreMessages={conversationMessages.hasMoreMessages}
          currentUserId={user?.id}
          onSendMessage={conversationMessages.sendMessage}
          onLoadMoreMessages={conversationMessages.loadMoreMessages}
        />
      </div>

      <NewChatModal
        isOpen={isNewChatModalOpen}
        onClose={() => setIsNewChatModalOpen(false)}
        onConversationCreated={handleConversationCreated}
      />

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </MainLayout>
  );
};
