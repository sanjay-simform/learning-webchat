import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "./AuthContext";
import {
  AUTH_LOGOUT_EVENT,
  buildWebSocketUrl,
  clearAuthSession,
  getAccessToken,
} from "../utils/auth-session";

export type SocketConnectionStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "disconnected"
  | "error";

type SocketEventHandler = (data: unknown) => void;

interface SocketContextType {
  status: SocketConnectionStatus;
  isConnected: boolean;
  sendEvent: <T = unknown>(event: string, data: T) => void;
  onEvent: (event: string, handler: SocketEventHandler) => () => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

const RECONNECT_BASE_DELAY_MS = 500;
const RECONNECT_MAX_DELAY_MS = 8000;

export const SocketProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const socketRef = useRef<WebSocket | null>(null);
  const connectRef = useRef<() => void>(() => undefined);
  const reconnectTimerRef = useRef<number | null>(null);
  const reconnectAttemptRef = useRef(0);
  const shouldReconnectRef = useRef(false);
  const listenersRef = useRef(new Map<string, Set<SocketEventHandler>>());
  const [status, setStatus] = useState<SocketConnectionStatus>("idle");

  const emitToListeners = useCallback((event: string, data: unknown) => {
    const listeners = listenersRef.current.get(event);
    if (!listeners || listeners.size === 0) {
      return;
    }

    for (const listener of listeners) {
      try {
        listener(data);
      } catch {
        // Listener failures should not break the socket pipeline.
      }
    }
  }, []);

  const disconnect = useCallback(() => {
    shouldReconnectRef.current = false;
    reconnectAttemptRef.current = 0;

    if (reconnectTimerRef.current !== null) {
      window.clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }

    const socket = socketRef.current;
    socketRef.current = null;

    if (socket) {
      socket.onopen = null;
      socket.onmessage = null;
      socket.onerror = null;
      socket.onclose = null;

      if (
        socket.readyState === WebSocket.OPEN ||
        socket.readyState === WebSocket.CONNECTING
      ) {
        socket.close();
      }
    }
  }, []);

  const scheduleReconnect = useCallback(() => {
    if (!shouldReconnectRef.current) {
      return;
    }

    const delay = Math.min(
      RECONNECT_BASE_DELAY_MS * 2 ** reconnectAttemptRef.current,
      RECONNECT_MAX_DELAY_MS,
    );

    reconnectAttemptRef.current += 1;

    if (reconnectTimerRef.current !== null) {
      window.clearTimeout(reconnectTimerRef.current);
    }

    reconnectTimerRef.current = window.setTimeout(() => {
      reconnectTimerRef.current = null;
      connectRef.current();
    }, delay);
  }, []);

  const connect = useCallback(() => {
    const token = getAccessToken();
    const userId = user?.id ?? null;

    if (!userId || !token) {
      disconnect();
      setStatus("idle");
      return;
    }

    shouldReconnectRef.current = true;
    setStatus("connecting");

    const socket = new WebSocket(buildWebSocketUrl("/ws", token));
    socketRef.current = socket;

    socket.onopen = () => {
      reconnectAttemptRef.current = 0;
      setStatus("connected");
    };

    socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(String(event.data)) as {
          event?: string;
          data?: unknown;
        };

        if (!payload?.event) {
          return;
        }

        if (payload.event === "auth_error") {
          clearAuthSession();
          disconnect();
          setStatus("error");
          window.location.href = "/signin";
          return;
        }

        emitToListeners(payload.event, payload.data);
      } catch {
        // Ignore invalid payloads. The gateway always sends JSON envelopes.
      }
    };

    socket.onerror = () => {
      setStatus("error");
    };

    socket.onclose = () => {
      socketRef.current = null;
      setStatus(userId ? "disconnected" : "idle");
      scheduleReconnect();
    };
  }, [disconnect, emitToListeners, scheduleReconnect, user?.id]);

  const sendEvent = useCallback(<T,>(event: string, data: T) => {
    const socket = socketRef.current;

    if (!socket || socket.readyState !== WebSocket.OPEN) {
      throw new Error("WebSocket connection is not available");
    }

    socket.send(JSON.stringify({ event, data }));
  }, []);

  const onEvent = useCallback((event: string, handler: SocketEventHandler) => {
    const listeners =
      listenersRef.current.get(event) ?? new Set<SocketEventHandler>();
    listeners.add(handler);
    listenersRef.current.set(event, listeners);

    return () => {
      const activeListeners = listenersRef.current.get(event);
      if (!activeListeners) {
        return;
      }

      activeListeners.delete(handler);
      if (activeListeners.size === 0) {
        listenersRef.current.delete(event);
      }
    };
  }, []);

  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  useEffect(() => {
    const handleLogout = () => {
      disconnect();
      setStatus("idle");
    };

    window.addEventListener(AUTH_LOGOUT_EVENT, handleLogout);
    return () => window.removeEventListener(AUTH_LOGOUT_EVENT, handleLogout);
  }, [disconnect]);

  useEffect(() => {
    if (user?.id && getAccessToken()) {
      connect();
      return;
    }

    disconnect();
    setStatus("idle");
  }, [connect, disconnect, user?.id]);

  const value = useMemo<SocketContextType>(
    () => ({
      status,
      isConnected: status === "connected",
      sendEvent,
      onEvent,
    }),
    [onEvent, sendEvent, status],
  );

  return (
    <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSocket must be used within SocketProvider");
  }

  return context;
};

export const useSocketEvent = (event: string, handler: SocketEventHandler) => {
  const { onEvent } = useSocket();

  useEffect(() => onEvent(event, handler), [event, handler, onEvent]);
};
