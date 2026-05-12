import { Inject, Injectable } from '@nestjs/common';

import IORedis from 'ioredis';
import { REDIS_CONNECTION } from './constants';

@Injectable()
export class CacheService {
  constructor(@Inject(REDIS_CONNECTION) private redis: IORedis) {}

  async get<T>(key: string): Promise<T | null> {
    const value = await this.redis.get(key);
    return value ? JSON.parse(value) : null;
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const data = JSON.stringify(value);

    if (ttlSeconds) {
      await this.redis.set(key, data, 'EX', ttlSeconds);
    } else {
      await this.redis.set(key, data);
    }
  }

  async update<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    if (!(await this.redis.exists(key))) {
      await this.set(key, value, ttlSeconds);
    } else {
      await this.redis.del(key);
      await this.set(key, value, ttlSeconds);
    }
  }

  async del(key: string): Promise<void> {
    await this.redis.del(key);
  }

  async exists(key: string): Promise<boolean> {
    return (await this.redis.exists(key)) === 1;
  }

  async getWithCacheOrNew(
    cacheKey: string,
    fetchFunction: () => Promise<any>,
    ttlSeconds?: number,
  ): Promise<any> {
    if (await this.exists(cacheKey)) {
      return await this.get(cacheKey);
    }

    const data = await fetchFunction();
    await this.set(cacheKey, data, ttlSeconds);
    return data;
  }
  async scanAndUnlink(pattern: string): Promise<void> {
    const stream = this.redis.scanStream({ match: pattern, count: 100 });

    const pipeline = this.redis.pipeline();

    let queued = 0;

    await new Promise<void>((resolve, reject) => {
      stream.on('data', (keys: string[]) => {
        if (keys.length === 0) return;

        keys.forEach((key) => pipeline.unlink(key));

        queued += keys.length;
      });

      stream.on('end', resolve);

      stream.on('error', reject);
    });

    if (queued > 0) {
      await pipeline.exec();
    }
  }
}
