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
  timestamp: Date;
  isRead?: boolean;
  status?: "pending" | "queued" | "delivered" | "stored" | "failed";
  clientMsgId?: string;
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
