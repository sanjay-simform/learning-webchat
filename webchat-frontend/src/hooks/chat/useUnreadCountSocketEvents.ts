import { useEffect } from "react";
import { useSocket } from "../../context/SocketContext";

interface UnreadCountUpdatedEvent {
  conversationId: string;
  unreadCount: number;
  recipientUserId: string;
}

interface UseUnreadCountSocketEventsOptions {
  onUnreadCountUpdated: (event: UnreadCountUpdatedEvent) => void;
}

export function useUnreadCountSocketEvents({
  onUnreadCountUpdated,
}: UseUnreadCountSocketEventsOptions): void {
  const { onEvent } = useSocket();

  useEffect(() => {
    const unsubscribeUnreadCountUpdated = onEvent(
      "unread_count_updated",
      (payload) => {
        const event = payload as UnreadCountUpdatedEvent;
        onUnreadCountUpdated(event);
      },
    );

    return () => {
      unsubscribeUnreadCountUpdated();
    };
  }, [onEvent, onUnreadCountUpdated]);
}
