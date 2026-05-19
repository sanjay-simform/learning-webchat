import { useCallback, useState } from "react";

interface UnreadState {
  [conversationId: string]: number;
}

export const useUnreadMessages = () => {
  const [unreadCounts, setUnreadCounts] = useState<UnreadState>({});

  const incrementUnread = useCallback((conversationId: string) => {
    setUnreadCounts((prev) => ({
      ...prev,
      [conversationId]: (prev[conversationId] ?? 0) + 1,
    }));
  }, []);

  const resetUnread = useCallback((conversationId: string) => {
    setUnreadCounts((prev) => ({
      ...prev,
      [conversationId]: 0,
    }));
  }, []);

  const setUnreadCount = useCallback(
    (conversationId: string, count: number) => {
      setUnreadCounts((prev) => ({
        ...prev,
        [conversationId]: count,
      }));
    },
    [],
  );

  const setAllUnreadCounts = useCallback((counts: Record<string, number>) => {
    setUnreadCounts(counts);
  }, []);

  const getUnreadCount = useCallback(
    (conversationId: string): number => {
      return unreadCounts[conversationId] ?? 0;
    },
    [unreadCounts],
  );

  const getTotalUnread = useCallback((): number => {
    return Object.values(unreadCounts).reduce((sum, count) => sum + count, 0);
  }, [unreadCounts]);

  return {
    unreadCounts,
    incrementUnread,
    resetUnread,
    setUnreadCount,
    setAllUnreadCounts,
    getUnreadCount,
    getTotalUnread,
  };
};
