import { Injectable } from '@nestjs/common';
import { Redis } from 'ioredis';
import { REDIS_CONNECTION } from '../constants';
import { Inject } from '@nestjs/common';

export interface CachedUser {
  id: string;
  username: string;
  password: string;
}

@Injectable()
export class CacheService {
  private readonly TTL_USER = 3600; // 1 hour

  constructor(@Inject(REDIS_CONNECTION) private redis: Redis) {}

  async getUser(username: string): Promise<CachedUser | null> {
    try {
      const key = `user:username:${username}`;
      const cached = await this.redis.getex(key, 'EX', this.TTL_USER);

      if (!cached) return null;

      return JSON.parse(cached) as CachedUser;
    } catch (error) {
      console.error('Cache get failed:', error);
      return null; // Treat cache errors as misses
    }
  }

  async setUser(username: string, user: CachedUser): Promise<void> {
    try {
      const key = `user:username:${username}`;
      const serialized = JSON.stringify(user);
      await this.redis.setex(key, this.TTL_USER, serialized);
    } catch (error) {
      console.error('Cache set failed:', error);
      // Non-blocking: cache failure doesn't fail the request
    }
  }

  async invalidateUser(username: string): Promise<void> {
    try {
      const key = `user:username:${username}`;
      await this.redis.del(key);
    } catch (error) {
      console.error('Cache invalidate failed:', error);
    }
  }

  async invalidateUsers(usernames: string[]): Promise<void> {
    try {
      const keys = usernames.map((u) => `user:username:${u}`);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } catch (error) {
      console.error('Bulk cache invalidate failed:', error);
    }
  }
}
