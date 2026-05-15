import { useNavigate, useParams } from "react-router-dom";
import { motion } from "motion/react";
import { MainLayout } from "../../../layouts/MainLayout";
import { ChatPanel } from "../components";
import { useConversations } from "../../../api-client/services/conversation/conversation.service";
import { useAuth } from "../../../context/AuthContext";
import { useConversationMessages } from "../../../hooks/useConversationMessages";

export const ChatDetailPage = () => {
  const { chatId } = useParams<{ chatId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const conversationsQuery = useConversations();
  const conversations = conversationsQuery.data?.data ?? [];
  const conversation = chatId
    ? (conversations.find((item) => item.id === chatId) ?? null)
    : null;
  const conversationMessages = useConversationMessages(conversation);
  const handleBackClick = () => {
    navigate("/chat");
  };

  if (conversationsQuery.isLoading) {
    return (
      <MainLayout>
        <div className="flex-1 flex items-center justify-center bg-base">
          <div className="text-sm text-text-secondary">
            Loading conversation...
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!conversation) {
    return (
      <MainLayout>
        <div className="flex-1 flex items-center justify-center bg-base">
          <div className="text-center">
            <svg
              className="w-12 h-12 mx-auto mb-4 text-text-muted opacity-50"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-sm text-text-secondary mb-4">Chat not found</p>
            <button
              onClick={handleBackClick}
              className="btn-primary text-sm py-2 px-4 rounded-lg"
            >
              Back to Chats
            </button>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="flex-1 flex flex-col h-screen">
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="px-4 md:px-6 py-4 border-b border-obsidian-500 border-opacity-30 flex items-center justify-between gap-4 bg-base"
        >
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={handleBackClick}
              className="p-2 hover:bg-elevated rounded-lg transition-colors shrink-0 md:hidden"
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
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>

            <div className="w-10 h-10 rounded-full bg-linear-to-br from-accent-cyan via-accent-violet to-accent-rose bg-opacity-20 flex items-center justify-center shrink-0 relative">
              <span className="text-xs font-semibold text-accent-cyan">
                {conversation.peer.username?.charAt(0).toUpperCase()}
              </span>
            </div>

            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-primary truncate">
                {conversation.peer.username}
              </h2>
              {/* <p className="text-xs text-text-secondary">
                {conversationMessages.isSending
                  ? "Sending..."
                  : "Encrypted chat"}
              </p> */}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button className="p-2 hover:bg-elevated rounded-lg transition-colors">
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
                  d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
            </button>
            <button className="p-2 hover:bg-elevated rounded-lg transition-colors">
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
                  d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5A2.25 2.25 0 008.25 22.5h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25h-2.25m0 18h5m-5-4h5"
                />
              </svg>
            </button>
          </div>
        </motion.div>

        <ChatPanel
          chat={{
            id: conversation.id,
            userId: conversation.peer.id,
            username: conversation.peer.username,
          }}
          conversationMessageKey={
            conversationMessages.getEncryptionKeyForMessage
          }
          messages={conversationMessages.messages}
          isLoading={conversationMessages.isLoading}
          isLoadingMoreMessages={conversationMessages.isLoadingMoreMessages}
          hasMoreMessages={conversationMessages.hasMoreMessages}
          currentUserId={user?.id}
          onSendMessage={conversationMessages.sendMessage}
          onLoadMoreMessages={conversationMessages.loadMoreMessages}
        />
      </div>
    </MainLayout>
  );
};
