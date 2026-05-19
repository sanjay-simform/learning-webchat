export interface ConversationPeerDto {
  id: string;
  username: string;
  userProfile: {
    avatarUrl: string | null;
    displayName: string | null;
  };
}

export interface ConversationSummaryDto {
  id: string;
  createdAt: string;
  encryptedConversationKey: string;
  peer: ConversationPeerDto;
  unreadCount: number;
}

export interface InviteUserRequestDto {
  userId: string;
}
