export interface MessageItemDto {
  id: string;
  conversationId: string;
  senderUserId: string;
  cipherText: string;
  iv: string;
  authTag: string;
  createdAt: string;
}

export interface MessagesResponseDto {
  items: MessageItemDto[];
  nextCursor: string | null;
}

export interface MessagesQueryDto {
  cursor?: string;
  limit?: number;
}
