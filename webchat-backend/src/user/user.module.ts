import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/database/schemas/user.schema';
import { UserService } from './services/user.service';
import { UserProfile } from 'src/database/schemas/user-profile.schema';

@Module({
  imports: [TypeOrmModule.forFeature([User, UserProfile])],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
