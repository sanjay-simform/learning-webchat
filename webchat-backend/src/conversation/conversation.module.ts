import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { ConversationMember } from 'src/database/schemas/conversation-member.schema';
import { Conversation } from 'src/database/schemas/conversation.schema';
import { MessageEntity } from 'src/database/schemas/messages.schema';
import { User } from 'src/database/schemas/user.schema';
import { RedisModule } from 'src/redis/redis.module';
import { SharedModule } from 'src/shared/shared.module';
import { ConversationController } from './controllers/conversation.controller';
import { MessagesController } from './controllers/messages.controller';
import { ConversationCryptoService } from './services/conversation-crypto.service';
import { ConversationService } from './services/conversation.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Conversation,
      ConversationMember,
      MessageEntity,
      User,
    ]),
    SharedModule,
    RedisModule,
  ],
  controllers: [ConversationController, MessagesController],
  providers: [ConversationService, ConversationCryptoService, JwtAuthGuard],
})
export class ConversationModule {}
