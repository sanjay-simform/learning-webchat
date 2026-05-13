export class MessageItemDto {
  id!: string;
  conversationId!: string;
  senderUserId!: string;
  cipherText!: string;
  iv!: string;
  authTag!: string;
  createdAt!: Date;
}

export class MessagesResponseDto {
  items!: MessageItemDto[];
  nextCursor!: string | null;
}
