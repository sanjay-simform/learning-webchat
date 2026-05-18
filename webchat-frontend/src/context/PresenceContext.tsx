import React, { createContext, useContext, useEffect, useState } from "react";
import { useSocket } from "./SocketContext";

interface PresenceEventData {
  userId: string;
  timestamp?: number;
}

interface PresenceContextType {
  onlineUsers: Set<string>;
  isUserOnline: (userId: string) => boolean;
}

const PresenceContext = createContext<PresenceContextType | undefined>(
  undefined,
);

export const PresenceProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const { onEvent } = useSocket();

  useEffect(() => {
    // Listen for user coming online
    const unsubscribeOnline = onEvent("user_came_online", (data: unknown) => {
      const eventData = data as PresenceEventData;
      setOnlineUsers((prev) => {
        const updated = new Set(prev);
        updated.add(eventData.userId);
        return updated;
      });
    });

    // Listen for user going offline
    const unsubscribeOffline = onEvent("user_went_offline", (data: unknown) => {
      const eventData = data as PresenceEventData;
      setOnlineUsers((prev) => {
        const updated = new Set(prev);
        updated.delete(eventData.userId);
        return updated;
      });
    });

    return () => {
      unsubscribeOnline?.();
      unsubscribeOffline?.();
    };
  }, [onEvent]);

  const isUserOnline = (userId: string): boolean => {
    return onlineUsers.has(userId);
  };

  return (
    <PresenceContext.Provider value={{ onlineUsers, isUserOnline }}>
      {children}
    </PresenceContext.Provider>
  );
};

export const usePresence = (): PresenceContextType => {
  const context = useContext(PresenceContext);
  if (!context) {
    throw new Error("usePresence must be used within PresenceProvider");
  }
  return context;
};
