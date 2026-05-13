import { motion } from "motion/react";
import { cn } from "../lib/cn";

interface MessageBubbleProps {
  content: string;
  isSelf?: boolean;
  timestamp?: string;
  className?: string;
}

export const MessageBubble = ({
  content,
  isSelf = false,
  timestamp,
  className,
}: MessageBubbleProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={cn(
        isSelf ? "chat-bubble-self ml-auto" : "chat-bubble-other",
        className,
      )}
    >
      <p className="text-sm break-words">{content}</p>
      {timestamp && <p className="text-xs chat-text-muted mt-1">{timestamp}</p>}
    </motion.div>
  );
};
