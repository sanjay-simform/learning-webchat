import { Module } from '@nestjs/common';
import { SearchController } from './search.controller';
import { SharedModule } from 'src/shared/shared.module';
import { RedisModule } from 'src/redis/redis.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/database/schemas/user.schema';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { SearchService } from './search.service';

@Module({
  imports: [TypeOrmModule.forFeature([User]), SharedModule, RedisModule],
  controllers: [SearchController],
  providers: [SearchService, JwtAuthGuard],
})
export class SearchModule {}
