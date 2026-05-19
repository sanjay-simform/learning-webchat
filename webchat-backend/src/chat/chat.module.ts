import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConversationMember } from 'src/database/schemas/conversation-member.schema';
import { MessageEntity } from 'src/database/schemas/messages.schema';
import { RedisModule } from 'src/redis/redis.module';
import { SharedModule } from 'src/shared/shared.module';
import { ChatGateway } from './chat.gateway';
import { ChatFanoutService } from './services/chat-fanout.service';
import { ConnectionRegistryService } from './services/connection-registry.service';
import { MessageWorkerService } from './services/message-worker.service';
import { ChatActivityService } from './services/chat-activity.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([ConversationMember, MessageEntity]),
    SharedModule,
    RedisModule,
  ],
  providers: [
    ChatGateway,
    ChatFanoutService,
    ConnectionRegistryService,
    MessageWorkerService,
    ChatActivityService,
  ],
  exports: [ChatGateway, ConnectionRegistryService, ChatActivityService],
})
export class ChatModule {}
