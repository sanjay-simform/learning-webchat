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

export interface MessageQueuedEvent {
  clientMsgId: string | null;
  status: "queued";
}

export interface MessageDeliveryAckEvent {
  messageId: string;
  clientMsgId: string | null;
  conversationId: string;
  senderUserId: string;
  recipientUserId: string;
  status: "delivered" | "stored";
  ackAt: string;
}
