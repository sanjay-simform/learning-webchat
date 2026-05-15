import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { RedisModule } from './redis/redis.module';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { SharedModule } from './shared/shared.module';
import { ConversationModule } from './conversation/conversation.module';
import { SearchModule } from './search/search.module';
import { ChatModule } from './chat/chat.module';
import { UploadModule } from './upload/upload.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import {
  MULTER_DESTINATION_FOLDER,
  UPLOAD_SERVE_ROOT,
} from './upload/constant/multer.contant';

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', MULTER_DESTINATION_FOLDER),
      serveRoot: UPLOAD_SERVE_ROOT,
    }),
    DatabaseModule,
    RedisModule,
    SharedModule,
    UserModule,
    AuthModule,
    ConversationModule,
    SearchModule,
    ChatModule,
    UploadModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
