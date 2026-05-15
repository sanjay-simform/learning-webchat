import type { MessagePayload, MessageStatus } from "../../types/chat";

export type MessageDeliveryStatus =
  | MessageStatus.QUEUED
  | MessageStatus.DELIVERED
  | MessageStatus.SEEN;

export interface OutboundChatMessageEvent {
  messageId: string;
  clientMsgId: string | null;
  conversationId: string;
  senderUserId: string;
  recipientUserId: string;
  cipherText: string;
  iv: string;
  authTag: string;
  createdAt: string;
  payload: MessagePayload;
}

export interface MessageQueuedEvent {
  clientMsgId: string | null;
  status: MessageStatus.QUEUED;
}

export interface MessageDeliveryAckEvent {
  messageId: string;
  clientMsgId: string | null;
  conversationId: string;
  senderUserId: string;
  recipientUserId: string;
  status: MessageDeliveryStatus;
  ackAt: string;
  payload?: MessagePayload;
}
