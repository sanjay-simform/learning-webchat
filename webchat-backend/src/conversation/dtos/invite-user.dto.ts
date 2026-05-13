import { IsUUID } from 'class-validator';

export class InviteUserDto {
  @IsUUID()
  userId: string;
}
