export interface ConversationPeerDto {
  id: string;
  username: string;
}

export interface ConversationSummaryDto {
  id: string;
  createdAt: string;
  encryptedConversationKey: string;
  peer: ConversationPeerDto;
}

export interface InviteUserRequestDto {
  userId: string;
}
