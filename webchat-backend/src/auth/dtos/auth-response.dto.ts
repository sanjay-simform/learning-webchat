import { Expose } from 'class-transformer';

export class UserDto {
  @Expose()
  id: string;

  @Expose()
  username: string;
}

export class AuthResponseDto {
  @Expose()
  access_token: string;

  @Expose()
  user: UserDto;
}
