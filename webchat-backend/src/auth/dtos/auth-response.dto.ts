import { Expose } from 'class-transformer';
import { CryptoDataDto } from './signup-request.dto';

export class UserDto {
  @Expose()
  id: string;

  @Expose()
  username: string;

  @Expose()
  cryptoData?: CryptoDataDto;
}

export class AuthResponseDto {
  @Expose()
  access_token: string;

  @Expose()
  user: UserDto;
}
