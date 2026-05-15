import { ArrayNotEmpty, ArrayUnique, IsArray, IsUUID } from 'class-validator';

export class MarkMessagesSeenDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsUUID(undefined, { each: true })
  messageIds!: string[];
}
