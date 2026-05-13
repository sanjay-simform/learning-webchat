export type MessageDeliveryStatus = 'delivered' | 'stored';

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
}

export interface MessageDeliveryAckEvent {
  messageId: string;
  clientMsgId: string | null;
  conversationId: string;
  senderUserId: string;
  recipientUserId: string;
  status: MessageDeliveryStatus;
  ackAt: string;
}
