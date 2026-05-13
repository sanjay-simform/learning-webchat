import {
  IsString,
  MinLength,
  MaxLength,
  Matches,
  IsObject,
  ValidateNested,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';

class DekDto {
  @IsString()
  cipherText: string;

  @IsString()
  iv: string;
}

class RsaDto {
  @IsString()
  publicKey: string;

  @IsObject()
  @ValidateNested()
  @Type(() => DekDto)
  privateKey: DekDto;
}

export class CryptoDataDto {
  @IsString()
  salt: string;

  @IsObject()
  @ValidateNested()
  @Type(() => DekDto)
  dek: DekDto;

  @IsObject()
  @ValidateNested()
  @Type(() => RsaDto)
  rsa: RsaDto;
}

export class SignupRequestDto {
  @IsString()
  @MinLength(3)
  @MaxLength(64)
  username: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/, {
    message:
      'Password must contain uppercase, lowercase, digit, and special character',
  })
  password: string;

  @IsObject()
  @ValidateNested()
  @Type(() => CryptoDataDto)
  @IsOptional()
  cryptoData?: CryptoDataDto;
}
