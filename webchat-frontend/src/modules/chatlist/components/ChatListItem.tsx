import { motion } from "motion/react";
import { cn } from "../../../lib/cn";
import { Avatar } from "../../../components/Avatar";
import type { ConversationSummaryDto } from "../../../api-client/services/conversation/conversation.service.dto";

interface ChatListItemProps {
  conversation: ConversationSummaryDto;
  isSelected: boolean;
  onClick: () => void;
}

export const ChatListItem = ({
  conversation,
  isSelected,
  onClick,
}: ChatListItemProps) => {
  const username = conversation.peer.username?.trim() || "Unknown user";
  const createdAt = new Date(conversation.createdAt);

  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      className={cn(
        "w-full p-3 rounded-lg transition-colors text-left group border",
        isSelected
          ? "bg-floating border-accent-cyan border-opacity-30 shadow-glow-cyan"
          : "bg-elevated border-obsidian-500 border-opacity-60 hover:bg-card hover:border-opacity-80",
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        {/* Avatar */}
        <Avatar initials={username.charAt(0).toUpperCase()} size="lg" />

        {/* Chat Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="text-sm font-medium text-primary truncate">
              {username}
            </h3>
            <span className="text-xs text-text-muted shrink-0">
              {formatTime(createdAt)}
            </span>
          </div>
          <p className="text-xs text-text-secondary truncate">
            Created {formatDate(createdAt)}
          </p>
        </div>
      </div>
    </motion.button>
  );
};

const formatTime = (date: Date): string => {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  if (hours < 24) return `${hours}h`;
  if (days < 7) return `${days}d`;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
};

const formatDate = (date: Date): string => {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year:
      date.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
  });
};
