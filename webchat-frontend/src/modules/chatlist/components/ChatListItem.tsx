import { motion } from "motion/react";
import { cn } from "../../../lib/cn";
import { Avatar } from "../../../components/Avatar";
import type { ConversationSummaryDto } from "../../../api-client/services/conversation/conversation.service.dto";
import { UPLOAD_BASE_URL } from "../../../api-client/api-client";
import { usePresence } from "../../../context/PresenceContext";

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
  const { isUserOnline } = usePresence();
  const username = conversation.peer.username?.trim() || "Unknown user";
  const avatarUrl = conversation.peer.userProfile?.avatarUrl
    ? UPLOAD_BASE_URL + conversation.peer.userProfile?.avatarUrl
    : null;
  const createdAt = new Date(conversation.createdAt);
  const peerIsOnline = isUserOnline(conversation.peer.id);

  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      className={cn(
        "w-full p-3 rounded-lg transition-colors text-left group border",
        isSelected
          ? "bg-floating border-accent-cyan border-opacity-30 border-cyan-300"
          : "bg-elevated border-obsidian-500 border-opacity-60 hover:bg-card hover:border-opacity-80",
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        {/* Avatar with Presence Indicator */}
        <div className="relative">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={username}
              className="max-w-16 max-h-16 rounded-full"
            />
          ) : (
            <Avatar initials={username.charAt(0).toUpperCase()} size="lg" />
          )}
          {/* Presence Indicator Dot */}
          <div
            className={cn(
              "absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-elevated",
              peerIsOnline ? "bg-green-500" : "bg-gray-500",
            )}
          />
        </div>

        {/* Chat Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-2">
            <div>
              {conversation.peer.userProfile?.displayName && (
                <h2 className="text-lg font-medium text-primary truncate">
                  {conversation.peer.userProfile.displayName}
                </h2>
              )}
              <h3 className="text-sm font-medium text-primary truncate">
                {username}
              </h3>
            </div>
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
