import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import type IORedis from 'ioredis';
import { REDIS_CONNECTION } from 'src/redis/constants';
import {
  PRESENCE_KEY_PREFIX,
  PRESENCE_ONLINE,
  PRESENCE_OFFLINE,
  PRESENCE_CHANNEL,
  INACTIVITY_TIMEOUT_SECONDS,
  PRESENCE_ACTIVITY_UPDATE_INTERVAL,
} from './constants';

export interface UserPresence {
  userId: string;
  status: 'online' | 'offline';
  lastActivity: number; // Unix timestamp in seconds
  connectedAt: number; // Unix timestamp in seconds
}

@Injectable()
export class PresenceService {
  private readonly logger = new Logger(PresenceService.name);
  private readonly lastActivityUpdates = new Map<string, number>(); // Track last update time to reduce Redis writes

  constructor(@Inject(REDIS_CONNECTION) private readonly redis: IORedis) {}

  /**
   * Mark user as online
   */
  async markOnline(userId: string): Promise<void> {
    try {
      const now = Math.floor(Date.now() / 1000);
      const key = this.getPresenceKey(userId);

      const presence: UserPresence = {
        userId,
        status: PRESENCE_ONLINE,
        lastActivity: now,
        connectedAt: now,
      };

      // Set presence data with no expiration (manually cleaned up via cron)
      await this.redis.set(key, JSON.stringify(presence));
      this.lastActivityUpdates.set(userId, now);

      // Publish update event
      await this.publishPresenceUpdate(userId, PRESENCE_ONLINE);

      this.logger.debug(`User ${userId} marked as online`);
    } catch (error) {
      this.logger.error(
        `Failed to mark user ${userId} as online: ${error instanceof Error ? error.message : String(error)}`,
      );
      // Non-blocking: don't fail request if Redis fails
    }
  }

  /**
   * Mark user as offline
   */
  async markOffline(userId: string): Promise<void> {
    try {
      const key = this.getPresenceKey(userId);

      // Delete the presence key
      await this.redis.del(key);
      this.lastActivityUpdates.delete(userId);

      // Publish update event
      await this.publishPresenceUpdate(userId, PRESENCE_OFFLINE);

      this.logger.debug(`User ${userId} marked as offline`);
    } catch (error) {
      this.logger.error(
        `Failed to mark user ${userId} as offline: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Update user's last activity timestamp (debounced to reduce Redis writes)
   */
  async updateActivity(userId: string): Promise<void> {
    try {
      const now = Math.floor(Date.now() / 1000);
      const lastUpdate = this.lastActivityUpdates.get(userId) ?? 0;

      // Only update if PRESENCE_ACTIVITY_UPDATE_INTERVAL seconds have passed
      if (now - lastUpdate < PRESENCE_ACTIVITY_UPDATE_INTERVAL) {
        return;
      }

      const key = this.getPresenceKey(userId);
      const presenceStr = await this.redis.get(key);

      if (!presenceStr) {
        // User is not online, skip
        return;
      }

      const presence = JSON.parse(presenceStr) as UserPresence;
      presence.lastActivity = now;

      await this.redis.set(key, JSON.stringify(presence));
      this.lastActivityUpdates.set(userId, now);

      this.logger.debug(`Updated activity for user ${userId}`);
    } catch (error) {
      this.logger.error(
        `Failed to update activity for user ${userId}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Get presence for a single user
   */
  async getPresence(userId: string): Promise<UserPresence | null> {
    try {
      const key = this.getPresenceKey(userId);
      const presenceStr = await this.redis.get(key);

      if (!presenceStr) {
        return null;
      }

      return JSON.parse(presenceStr) as UserPresence;
    } catch (error) {
      this.logger.error(
        `Failed to get presence for user ${userId}: ${error instanceof Error ? error.message : String(error)}`,
      );
      return null;
    }
  }

  /**
   * Get presence for multiple users (batch operation)
   */
  async getUsersPresence(
    userIds: string[],
  ): Promise<Map<string, UserPresence>> {
    const result = new Map<string, UserPresence>();

    if (userIds.length === 0) {
      return result;
    }

    try {
      const keys = userIds.map((id) => this.getPresenceKey(id));
      const values = await this.redis.mget(...keys);

      for (let i = 0; i < userIds.length; i++) {
        const userId = userIds[i];
        const presenceStr = values[i];

        if (presenceStr) {
          try {
            const presence = JSON.parse(presenceStr) as UserPresence;
            result.set(userId, presence);
          } catch (parseError) {
            this.logger.warn(`Failed to parse presence for user ${userId}`);
          }
        }
      }

      return result;
    } catch (error) {
      this.logger.error(
        `Failed to batch get presences: ${error instanceof Error ? error.message : String(error)}`,
      );
      return result;
    }
  }

  /**
   * Clean up inactive users (called by scheduled job)
   * Marks users as offline if their lastActivity exceeds INACTIVITY_TIMEOUT_SECONDS
   */
  async cleanupInactiveUsers(): Promise<number> {
    try {
      const now = Math.floor(Date.now() / 1000);
      const pattern = `${PRESENCE_KEY_PREFIX}:*`;
      let cursor = '0';
      let cleanedCount = 0;

      // Use SCAN to iterate through all presence keys
      do {
        const [newCursor, keys] = await this.redis.scan(
          cursor,
          'MATCH',
          pattern,
          'COUNT',
          100,
        );

        for (const key of keys) {
          const presenceStr = await this.redis.get(key);
          if (!presenceStr) {
            continue;
          }

          try {
            const presence = JSON.parse(presenceStr) as UserPresence;
            const inactivityDuration = now - presence.lastActivity;

            if (inactivityDuration > INACTIVITY_TIMEOUT_SECONDS) {
              // Extract userId from key and mark as offline
              const userId = key.replace(`${PRESENCE_KEY_PREFIX}:`, '');
              await this.markOffline(userId);
              cleanedCount++;
            }
          } catch (parseError) {
            this.logger.warn(`Failed to parse presence key ${key}`);
            await this.redis.del(key); // Clean up corrupted keys
          }
        }

        cursor = newCursor;
      } while (cursor !== '0');

      if (cleanedCount > 0) {
        this.logger.debug(`Cleaned up ${cleanedCount} inactive users`);
      }

      return cleanedCount;
    } catch (error) {
      this.logger.error(
        `Failed to cleanup inactive users: ${error instanceof Error ? error.message : String(error)}`,
      );
      return 0;
    }
  }

  /**
   * Publish presence update event to Redis channel
   */
  private async publishPresenceUpdate(
    userId: string,
    status: 'online' | 'offline',
  ): Promise<void> {
    try {
      const message = JSON.stringify({
        userId,
        status,
        timestamp: Math.floor(Date.now() / 1000),
      });

      await this.redis.publish(PRESENCE_CHANNEL, message);
    } catch (error) {
      this.logger.error(
        `Failed to publish presence update: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Helper to get Redis key for a user's presence
   */
  private getPresenceKey(userId: string): string {
    return `${PRESENCE_KEY_PREFIX}:${userId}`;
  }
}
