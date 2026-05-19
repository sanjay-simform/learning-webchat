import {
  MessagePayload,
  MessageStatus,
} from 'src/database/schemas/messages.schema';

export type MessageDeliveryStatus =
  | MessageStatus.QUEUED
  | MessageStatus.DELIVERED
  | MessageStatus.SEEN
  | MessageStatus.FAILED;

export interface OutboundChatMessageEvent {
  messageId: string;
  clientMsgId: string | null;
  conversationId: string;
  senderUserId: string;
  recipientUserId: string;
  cipherText: string | null;
  iv: string;
  authTag: string;
  createdAt: string;
  payload: MessagePayload;
}

export interface MessageSeenReceiptEvent {
  messageIds: string[];
  recipientUserId: string;
  seenAt: string;
}

export interface MessageDeliveredReceiptEvent {
  messageIds: string[];
  recipientUserId: string;
  deliveredAt: string;
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

export interface UnreadCountUpdatedEvent {
  conversationId: string;
  unreadCount: number;
  recipientUserId: string;
}
