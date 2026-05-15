import { ArrayNotEmpty, ArrayUnique, IsArray, IsUUID } from 'class-validator';

export class MarkMessagesDeliveredDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsUUID(undefined, { each: true })
  messageIds!: string[];
}
