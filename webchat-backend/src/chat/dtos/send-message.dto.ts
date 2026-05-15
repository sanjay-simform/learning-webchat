import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { type MessagePayload } from 'src/database/schemas/messages.schema';

export class SendMessageDto {
  @IsUUID()
  conversationId!: string;

  @IsOptional()
  cipherText!: string;

  @IsOptional()
  iv!: string;

  @IsOptional()
  authTag!: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  clientMsgId?: string;

  @IsOptional()
  payload!: MessagePayload;
}
