import { Inject, Injectable } from '@nestjs/common';
import { REDIS_CONNECTION } from './constants';
import IORedis from 'ioredis';

@Injectable()
export class RedisService {
  constructor(@Inject(REDIS_CONNECTION) private redis: IORedis) {}
}
