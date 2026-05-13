import { motion } from "motion/react";

export const EmptyChat = () => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="h-full flex items-center justify-center bg-base"
    >
      <div className="text-center max-w-sm px-6">
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <div className="w-16 h-16 mx-auto mb-4 bg-linear-to-br from-accent-cyan via-accent-violet to-accent-rose bg-opacity-20 rounded-full flex items-center justify-center">
            <svg
              className="w-8 h-8 text-accent-cyan"
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
          </div>

          <h2 className="text-xl font-semibold text-primary mb-2">
            Select a chat to start
          </h2>
          <p className="text-sm text-text-secondary">
            Choose a conversation from the list to start messaging
          </p>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className="mt-6 p-4 chat-card rounded-lg"
          >
            <p className="text-xs text-text-muted flex items-center gap-2 justify-center">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M18 5v8a2 2 0 01-2 2h-5l-5 4v-4H4a2 2 0 01-2-2V5a2 2 0 012-2h12a2 2 0 012 2zm-11-1a1 1 0 11-2 0 1 1 0 012 0z"
                  clipRule="evenodd"
                />
              </svg>
              Your chats will appear here
            </p>
          </motion.div>
        </motion.div>
      </div>
    </motion.div>
  );
};
