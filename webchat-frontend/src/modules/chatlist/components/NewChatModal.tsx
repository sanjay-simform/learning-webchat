import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
} from "react";
import { AnimatePresence, motion } from "motion/react";
import { useAuth } from "../../../context/AuthContext";
import { Avatar } from "../../../components/Avatar";
import { LoadingSpinner } from "../../../components/LoadingSpinner";
import { useDebouncedValue } from "../../../hooks/useDebouncedValue";
import { useInfiniteSearchUsers } from "../../../api-client/services/search/search.service";
import { useInviteUser } from "../../../api-client/services/conversation/conversation.service";
import type { ConversationSummaryDto } from "../../../api-client/services/conversation/conversation.service.dto";
import { UPLOAD_BASE_URL } from "../../../api-client/api-client";

interface NewChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConversationCreated: (conversation: ConversationSummaryDto) => void;
}

const SEARCH_LIMIT = 20;
const DEBOUNCE_DELAY_MS = 300;

export const NewChatModal = ({
  isOpen,
  onClose,
  onConversationCreated,
}: NewChatModalProps) => {
  const { user } = useAuth();
  const [searchValue, setSearchValue] = useState("");
  const [activeInviteUserId, setActiveInviteUserId] = useState<string | null>(
    null,
  );
  const [actionError, setActionError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsContainerRef = useRef<HTMLDivElement>(null);

  const debouncedSearchValue = useDebouncedValue(
    searchValue,
    DEBOUNCE_DELAY_MS,
  );
  const normalizedQuery = debouncedSearchValue.trim();
  const inviteUserMutation = useInviteUser();
  const searchUsersQuery = useInfiniteSearchUsers({
    query: normalizedQuery,
    limit: SEARCH_LIMIT,
  });

  const searchResults = useMemo(
    () =>
      searchUsersQuery.data?.pages.flatMap((page) => page.data?.items ?? []) ??
      [],
    [searchUsersQuery.data],
  );

  const searchErrorMessage = useMemo(() => {
    const failedPage = searchUsersQuery.data?.pages.find((page) => page.error);
    return failedPage?.error?.message ?? null;
  }, [searchUsersQuery.data]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setSearchValue("");
      setActiveInviteUserId(null);
      setActionError(null);
      inputRef.current?.focus();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    if (resultsContainerRef.current) {
      resultsContainerRef.current.scrollTop = 0;
    }
  }, [normalizedQuery, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  const handleScroll = () => {
    const container = resultsContainerRef.current;

    if (
      !container ||
      !searchUsersQuery.hasNextPage ||
      searchUsersQuery.isFetchingNextPage ||
      searchUsersQuery.isLoading
    ) {
      return;
    }

    const remainingDistance =
      container.scrollHeight - container.scrollTop - container.clientHeight;

    if (remainingDistance < 72) {
      void searchUsersQuery.fetchNextPage();
    }
  };

  const handleInviteUser = async (invitedUserId: string) => {
    if (!invitedUserId || invitedUserId === user?.id) {
      return;
    }

    setActionError(null);
    setActiveInviteUserId(invitedUserId);

    try {
      const response = await inviteUserMutation.mutateAsync({
        userId: invitedUserId,
      });

      if (response.error) {
        setActionError(response.error.message);
        return;
      }

      if (response.data) {
        onConversationCreated(response.data);
        onClose();
      }
    } finally {
      setActiveInviteUserId(null);
    }
  };

  const showInitialPrompt = normalizedQuery.length === 0;
  const showSkeletons =
    !showInitialPrompt &&
    searchUsersQuery.isLoading &&
    searchResults.length === 0;
  const showNoResults =
    !showInitialPrompt &&
    !searchUsersQuery.isLoading &&
    !searchErrorMessage &&
    searchResults.length === 0;
  const showErrorState = Boolean(
    actionError || (searchErrorMessage && searchResults.length === 0),
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6"
        >
          <button
            type="button"
            aria-label="Close new chat modal"
            onClick={onClose}
            className="absolute inset-0 z-0 cursor-default bg-black/70 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
            className="relative z-10 flex w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-obsidian-500 border-opacity-60 bg-floating shadow-elevation-2 max-h-[calc(100vh-2rem)]"
          >
            <div className="flex items-start justify-between gap-4 border-b border-obsidian-500 border-opacity-30 px-5 py-4">
              <div>
                <h2 className="text-lg font-semibold text-primary">
                  Start a new chat
                </h2>
                <p className="mt-1 text-sm text-text-secondary">
                  Search by username and invite someone instantly.
                </p>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-2 text-text-secondary transition-colors hover:bg-elevated hover:text-primary"
                aria-label="Close"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="border-b border-obsidian-500 border-opacity-30 px-5 py-4">
              <label
                htmlFor="new-chat-search"
                className="mb-2 block text-sm font-medium text-text-secondary"
              >
                Search by username
              </label>
              <div className="relative">
                <input
                  ref={inputRef}
                  id="new-chat-search"
                  type="text"
                  value={searchValue}
                  onChange={(event) => {
                    setSearchValue(event.target.value);
                    setActionError(null);
                  }}
                  placeholder="Type a username to search"
                  className="w-full chat-input py-3 pl-11 pr-4 text-sm"
                />
                <svg
                  className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
            </div>

            <div className="flex-1 px-5 py-4">
              {showInitialPrompt ? (
                <EmptyState
                  icon={SearchIcon}
                  title="Search for a user"
                  description="Type at least one character to begin searching by username."
                />
              ) : showSkeletons ? (
                <SearchSkeletonList />
              ) : showErrorState ? (
                <EmptyState
                  icon={AlertIcon}
                  title="Search failed"
                  description={
                    actionError ??
                    searchErrorMessage ??
                    "Unable to load users right now."
                  }
                />
              ) : showNoResults ? (
                <EmptyState
                  icon={SearchIcon}
                  title="No matches found"
                  description="Try a different username or a shorter search term."
                />
              ) : (
                <div
                  ref={resultsContainerRef}
                  onScroll={handleScroll}
                  className="h-[360px] overflow-y-auto pr-1"
                >
                  <div className="space-y-2">
                    {searchResults.map((result) => {
                      const isCurrentUser = result.id === user?.id;
                      const isInviting = activeInviteUserId === result.id;

                      return (
                        <button
                          key={result.id}
                          type="button"
                          onClick={() => void handleInviteUser(result.id)}
                          disabled={isCurrentUser || isInviting}
                          className="group flex w-full items-center gap-3 rounded-xl border border-obsidian-500 border-opacity-50 bg-elevated px-4 py-3 text-left transition-colors hover:border-opacity-80 hover:bg-card disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {result.avatarUrl ? (
                            <img
                              src={UPLOAD_BASE_URL + result.avatarUrl}
                              alt={result.username}
                              className="h-10 w-10 rounded-full object-cover"
                            />
                          ) : (
                            <Avatar
                              initials={getInitials(result.username)}
                              size="md"
                            />
                          )}

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-3">
                              <h3 className="truncate text-sm font-semibold text-primary">
                                {result.username}
                              </h3>
                              <span className="shrink-0 text-xs text-text-muted">
                                {isCurrentUser ? "You" : "Invite"}
                              </span>
                            </div>
                            <p className="mt-1 truncate text-xs text-text-secondary">
                              {result?.displayName || "No display name"}
                            </p>
                          </div>

                          <div className="flex shrink-0 items-center justify-center">
                            {isInviting ? (
                              <LoadingSpinner size="sm" />
                            ) : (
                              <svg
                                className="h-4 w-4 text-text-muted transition-colors group-hover:text-accent-cyan"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                                />
                              </svg>
                            )}
                          </div>
                        </button>
                      );
                    })}

                    {searchUsersQuery.isFetchingNextPage && (
                      <div className="flex items-center justify-center py-3">
                        <LoadingSpinner size="sm" />
                      </div>
                    )}

                    {!searchUsersQuery.hasNextPage &&
                      searchResults.length > 0 && (
                        <p className="py-2 text-center text-xs text-text-muted">
                          End of results
                        </p>
                      )}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const EmptyState = ({
  icon: Icon,
  title,
  description,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) => {
  return (
    <div className="flex h-[360px] items-center justify-center px-6 text-center">
      <div className="max-w-sm">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-accent-cyan/10 text-accent-cyan">
          <Icon className="h-6 w-6" />
        </div>
        <h3 className="text-base font-semibold text-primary">{title}</h3>
        <p className="mt-2 text-sm text-text-secondary">{description}</p>
      </div>
    </div>
  );
};

const SearchSkeletonList = () => {
  return (
    <div className="h-[360px] overflow-hidden pr-1">
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={`search-skeleton-${index}`}
            className="flex items-center gap-3 rounded-xl border border-obsidian-500 border-opacity-50 bg-elevated px-4 py-3"
          >
            <div className="h-10 w-10 animate-pulse rounded-full bg-obsidian-500/50" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-3 w-32 animate-pulse rounded-full bg-obsidian-500/50" />
              <div className="h-2.5 w-40 animate-pulse rounded-full bg-obsidian-500/40" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const getInitials = (username: string): string => {
  const firstCharacter = username.trim().charAt(0).toUpperCase();
  return firstCharacter || "?";
};

const SearchIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.8}
      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
    />
  </svg>
);

const AlertIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.8}
      d="M12 8v4m0 4h.01M10.29 3.86l-8.08 14.03A2 2 0 003.93 21h16.14a2 2 0 001.72-3.11L13.71 3.86a2 2 0 00-3.42 0z"
    />
  </svg>
);
