import type { MessageStatus } from "../../../types/chat";

export enum MessageType {
  TEXT = "text",
  IMAGE = "image",
}
export interface MessagePayload {
  type: MessageType;
  mediaUrl: string;
  previewUrl: string;
  mimeType: string;
  fileSize: number;
  width: number;
  height: number;
  fileName: string;
  authTag: string;
  iv: string;
}
export interface MessageItemDto {
  id: string;
  conversationId: string;
  senderUserId: string;
  status?: MessageStatus;
  cipherText: string;
  iv: string;
  authTag: string;
  createdAt: string;
  payload: MessagePayload;
}

export interface MessagesResponseDto {
  items: MessageItemDto[];
  nextCursor: string | null;
}

export interface MessagesQueryDto {
  cursor?: string;
  limit?: number;
}
