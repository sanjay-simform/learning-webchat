export class ConversationPeerDto {
  id: string;
  username: string;
}

export class ConversationSummaryDto {
  id: string;
  createdAt: Date;
  encryptedConversationKey: string;
  peer: ConversationPeerDto;
}
