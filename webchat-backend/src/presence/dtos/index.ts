import { IsArray, IsString, IsUUID } from 'class-validator';

export class GetBatchPresenceDto {
  @IsArray()
  @IsUUID(4, { each: true })
  userIds: string[];
}

export class PresenceResponseDto {
  userId: string;
  status: 'online' | 'offline';
  lastActivity: number;
  connectedAt: number;
}

export class BatchPresenceResponseDto {
  presences: Map<string, PresenceResponseDto>;
}
