import { Module } from '@nestjs/common';

import { CacheService } from './services/cache.service';
import { BloomFilterService } from './services/bloom-filter.service';
import redisConnection from './redis.connnection';
import { RedisService } from './redis.service';
import {
  REDIS_CONNECTION,
  REDIS_PUBLISHER_CONNECTION,
  REDIS_SUBSCRIBER_CONNECTION,
} from './constants';

@Module({
  controllers: [],
  providers: [
    {
      provide: REDIS_CONNECTION,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      useValue: redisConnection,
    },
    {
      provide: REDIS_PUBLISHER_CONNECTION,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
      useFactory: () => redisConnection.duplicate(),
    },
    {
      provide: REDIS_SUBSCRIBER_CONNECTION,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
      useFactory: () => redisConnection.duplicate(),
    },
    RedisService,
    CacheService,
    BloomFilterService,
  ],
  exports: [
    REDIS_CONNECTION,
    REDIS_PUBLISHER_CONNECTION,
    REDIS_SUBSCRIBER_CONNECTION,
    RedisService,
    CacheService,
    BloomFilterService,
  ],
})
export class RedisModule {}
