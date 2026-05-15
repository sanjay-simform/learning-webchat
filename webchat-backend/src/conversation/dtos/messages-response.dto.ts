import {
  MessagePayload,
  MessageStatus,
} from 'src/database/schemas/messages.schema';

export class MessageItemDto {
  id!: string;
  conversationId!: string;
  senderUserId!: string;
  status!: MessageStatus;
  cipherText!: string | null;
  iv!: string;
  authTag!: string;
  createdAt!: Date;
  payload!: MessagePayload;
}

export class MessagesResponseDto {
  items!: MessageItemDto[];
  nextCursor!: string | null;
}
