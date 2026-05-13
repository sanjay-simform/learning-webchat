import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class SendMessageDto {
  @IsUUID()
  conversationId!: string;

  @IsString()
  @IsNotEmpty()
  cipherText!: string;

  @IsString()
  @IsNotEmpty()
  iv!: string;

  @IsString()
  @IsNotEmpty()
  authTag!: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  clientMsgId?: string;
}
