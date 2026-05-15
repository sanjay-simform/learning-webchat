export interface Chat {
  id: string;
  userId: string;
  username: string;
  email?: string;
  lastMessage?: string;
  lastMessageTime?: Date;
  unreadCount?: number;
  avatar?: string;
  isOnline?: boolean;
}
export enum MessageStatus {
  PENDING = "pending",
  QUEUED = "queued",
  DELIVERED = "delivered",
  SEEN = "seen",
  FAILED = "failed",
}
export enum MessageType {
  TEXT = "text",
  IMAGE = "image",
}
export interface MessagePayload {
  type: MessageType;
  mediaUrl?: string;
  previewUrl?: string;
  fileName?: string;
  mimeType?: string;
  fileSize?: number;
  width?: number;
  height?: number;
  authTag?: string;
  iv?: string;
}
export interface Message {
  id: string;
  chatId?: string;
  conversationId?: string;
  senderId: string;
  senderUsername: string;
  content: string;
  encryptedPayload?: {
    cipherText: string;
    iv: string;
    authTag: string;
  };
  imgUrl?: string;
  timestamp: Date;
  isRead?: boolean;
  status?: MessageStatus;
  clientMsgId?: string;
  payload: MessagePayload;
}

export interface ChatContextType {
  chats: Chat[];
  selectedChat: Chat | null;
  messages: Message[];
  isLoading: boolean;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectChat: (chat: Chat) => void;
  sendMessage: (chatId: string, content: string) => Promise<void>;
  loadChats: () => Promise<void>;
}
