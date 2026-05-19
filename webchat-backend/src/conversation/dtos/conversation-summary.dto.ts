import { UserProfile } from 'src/database/schemas/user-profile.schema';

export class ConversationPeerDto {
  id: string;
  username: string;
  userProfile: UserProfile | null; // Replace 'any' with the actual type of UserProfile if available
}

export class ConversationSummaryDto {
  id: string;
  createdAt: Date;
  encryptedConversationKey: string;
  peer: ConversationPeerDto;
  unreadCount: number;
}
