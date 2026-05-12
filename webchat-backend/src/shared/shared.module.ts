import { Module } from '@nestjs/common';
import { UsernameService } from './services/username.service';
import { PasswordService } from './services/password.service';
import { JwtService } from './services/jwt.service';

@Module({
  providers: [UsernameService, PasswordService, JwtService],
  exports: [UsernameService, PasswordService, JwtService],
})
export class SharedModule {}
