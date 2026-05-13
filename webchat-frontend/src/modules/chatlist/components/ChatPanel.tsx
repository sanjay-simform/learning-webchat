import { useState, useEffect, useLayoutEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import type { Chat, Message } from "../../../types/chat";
import { EmptyChat } from "./EmptyChat";
import { LoadingSpinner } from "../../../components/LoadingSpinner";

interface ChatPanelProps {
  chat: Chat | null;
  messages: Message[];
  isLoading: boolean;
  currentUserId?: string | null;
  onSendMessage: (content: string) => Promise<void>;
}

export const ChatPanel = ({
  chat,
  messages,
  isLoading,
  currentUserId,
  onSendMessage,
}: ChatPanelProps) => {
  const [messageContent, setMessageContent] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);

  useLayoutEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    if (isNearBottomRef.current) {
      container.scrollTop = container.scrollHeight;
    }
  }, [messages.length]);

  useEffect(() => {
    isNearBottomRef.current = true;
  }, [chat?.id]);

  const handleMessagesScroll = () => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;

    isNearBottomRef.current = distanceFromBottom < 120;
  };

  const submitMessage = async () => {
    if (!messageContent.trim() || !chat || isSending || isLoading) return;

    setIsSending(true);
    try {
      await onSendMessage(messageContent);
      setMessageContent("");
      setSendError(null);
    } catch (error) {
      setSendError(
        error instanceof Error ? error.message : "Failed to send message",
      );
    } finally {
      setIsSending(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    await submitMessage();
  };

  if (!chat) {
    return <EmptyChat />;
  }

  return (
    <div className="flex flex-col h-full bg-base">
      {/* Chat Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-4 md:px-6 py-4 border-b border-obsidian-500 border-opacity-30 flex items-center justify-between gap-4"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-full bg-linear-to-br from-accent-cyan via-accent-violet to-accent-rose bg-opacity-20 flex items-center justify-center shrink-0 relative">
            <span className="text-xs font-semibold text-accent-cyan">
              {chat.username?.charAt(0).toUpperCase()}
            </span>
            {chat.isOnline && (
              <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-semantic-success rounded-full border-2 border-base" />
            )}
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-primary truncate">
              {chat.username}
            </h2>
            <p className="text-xs text-text-secondary">
              {chat.isOnline ? "Active now" : "Away"}
            </p>
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

      {/* Messages Container */}
      <div
        ref={messagesContainerRef}
        onScroll={handleMessagesScroll}
        className="flex-1 overflow-y-auto px-4 md:px-6 py-4 space-y-3"
      >
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <LoadingSpinner />
          </div>
        ) : messages.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="h-full flex items-center justify-center"
          >
            <div className="text-center">
              <p className="text-sm text-text-secondary">
                Start a conversation with {chat.username}
              </p>
            </div>
          </motion.div>
        ) : (
          <AnimatePresence mode="popLayout">
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className={`flex ${
                  message.senderId === currentUserId
                    ? "justify-end"
                    : "justify-start"
                }`}
              >
                <div
                  className={`max-w-xs md:max-w-md px-4 py-2.5 rounded-lg ${
                    message.senderId === currentUserId
                      ? "bg-accent-cyan bg-opacity-20 text-primary rounded-br-none"
                      : "bg-elevated text-primary rounded-bl-none"
                  }`}
                >
                  <p className="text-sm wrap-break-word">{message.content}</p>
                  <div className="mt-1 flex items-center justify-between gap-3">
                    <p
                      className={`text-xs ${
                        message.senderId === currentUserId
                          ? "text-accent-cyan text-opacity-70"
                          : "text-text-muted"
                      }`}
                    >
                      {formatMessageTime(new Date(message.timestamp))}
                    </p>
                    {message.senderId === currentUserId && message.status && (
                      <p className="text-[10px] uppercase tracking-wide text-text-muted">
                        {message.status}
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* Message Input */}
      <motion.form
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        onSubmit={handleSendMessage}
        className="px-4 md:px-6 py-4 border-t border-obsidian-500 border-opacity-30 flex items-end gap-3"
      >
        <button
          type="button"
          disabled={isLoading}
          className="p-2.5 hover:bg-elevated rounded-lg transition-colors shrink-0"
        >
          <svg
            className="w-5 h-5 text-accent-cyan"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
        </button>

        <div className="flex-1">
          <textarea
            value={messageContent}
            disabled={isLoading}
            onChange={(e) => {
              setMessageContent(e.target.value);
              if (sendError) {
                setSendError(null);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void submitMessage();
              }
            }}
            placeholder="Type a message..."
            className="w-full chat-input pl-4 pr-4 py-2.5 text-sm resize-none max-h-32"
            rows={1}
          />
        </div>

        <button
          type="submit"
          disabled={!messageContent.trim() || isSending || isLoading}
          className="p-2.5 hover:bg-elevated rounded-lg transition-colors shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSending ? (
            <svg
              className="w-5 h-5 text-accent-cyan animate-spin"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
          ) : (
            <svg
              className="w-5 h-5 text-accent-cyan"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5.951-1.488 5.951 1.488a1 1 0 001.169-1.409l-7-14z" />
            </svg>
          )}
        </button>
      </motion.form>

      {sendError && (
        <div className="px-4 md:px-6 pb-3 text-xs text-semantic-danger">
          {sendError}
        </div>
      )}
    </div>
  );
};

const formatMessageTime = (date: Date): string => {
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
};
