import { Injectable } from '@nestjs/common';
import { Redis } from 'ioredis';
import { REDIS_CONNECTION } from '../constants';
import { Inject } from '@nestjs/common';

const BLOOM_KEY = 'auth:usernames:bloom';
const BLOOM_REBUILD_LOCK = 'auth:usernames:bloom:rebuild-lock';

@Injectable()
export class BloomFilterService {
  constructor(@Inject(REDIS_CONNECTION) private redis: Redis) {}

  /**
   * Check if username is in Bloom filter
   * Returns false = "definitely not in DB"
   * Returns true = "probably in DB, check further"
   */
  async mightExist(username: string): Promise<boolean> {
    try {
      const result = await this.redis.call('BF.EXISTS', BLOOM_KEY, username);
      return result === 1;
    } catch (error) {
      // If Bloom check fails, assume it exists (safe fallback to DB)
      console.error('Bloom exists check failed:', error);
      return true;
    }
  }

  /**
   * Add username to Bloom filter (on successful signup)
   */
  async add(username: string): Promise<void> {
    try {
      // BF.ADD returns 0 if already exists, 1 if newly added
      // We don't care about the result, just add it
      await this.redis.call('BF.ADD', BLOOM_KEY, username);
    } catch (error) {
      // Bloom add failure is non-blocking (log but don't fail signup)
      console.error('Bloom filter add failed:', error);
    }
  }

  /**
   * Bulk add usernames (on rebuild)
   */
  async addMultiple(usernames: string[]): Promise<void> {
    try {
      for (const username of usernames) {
        await this.redis.call('BF.ADD', BLOOM_KEY, username);
      }
    } catch (error) {
      console.error('Bloom filter bulk add failed:', error);
    }
  }

  /**
   * Clear and rebuild from database
   * Called periodically or on deployment
   */
  async rebuild(usernames: string[]): Promise<void> {
    const lockKey = BLOOM_REBUILD_LOCK;

    try {
      // Acquire lock to prevent concurrent rebuilds
      const acquired = await this.redis.set(lockKey, '1', 'EX', 300, 'NX');

      if (!acquired) {
        console.log('Bloom filter rebuild already in progress');
        return;
      }

      try {
        // Delete old filter
        await this.redis.del(BLOOM_KEY);

        // Recreate filter with all usernames
        await this.addMultiple(usernames);

        console.log(`Bloom filter rebuilt with ${usernames.length} usernames`);
      } finally {
        await this.redis.del(lockKey);
      }
    } catch (error) {
      console.error('Bloom filter rebuild failed:', error);
    }
  }

  /**
   * Get Bloom filter info for monitoring
   */
  async getInfo(): Promise<any> {
    try {
      const info = (await this.redis.call('BF.INFO', BLOOM_KEY)) as any[];
      return {
        capacity: info[1],
        size: info[3],
        filter_count: info[5],
        expansion: info[7],
      };
    } catch (error) {
      console.error('Bloom info fetch failed:', error);
      return null;
    }
  }

  /**
   * Check if Bloom filter exists, if not initialize it
   */
  async initialize(): Promise<void> {
    try {
      const exists = await this.redis.exists(BLOOM_KEY);
      if (!exists) {
        console.log(
          'Bloom filter not found, it will be created on first signup',
        );
      }
    } catch (error) {
      console.error('Bloom initialize failed:', error);
    }
  }
}
