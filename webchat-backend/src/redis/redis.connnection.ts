// redis.connection.ts
import { Logger } from '@nestjs/common';

import IORedis from 'ioredis';
import { ENV } from 'src/config/env';

const logger = new Logger('Redis');

// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
export const redisConnection = new IORedis({
  host: ENV.REDIS.HOST,
  port: ENV.REDIS.PORT,
  ...(ENV.REDIS.PASSWORD && { password: ENV.REDIS.PASSWORD }),

  // Stability
  maxRetriesPerRequest: null,
  // enableOfflineQueue: false,
  lazyConnect: true,
  connectTimeout: 60000,
  // keepAlive: 60000,
  ...(ENV.REDIS.SSL && {
    tls: {
      rejectUnauthorized: false,
    },
  }),
});

// eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
redisConnection.on('connect', () => logger.log('Redis Successfully Connected'));
// eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
redisConnection.on('error', (e) => logger.error('Redis Connection Error', e));

export default redisConnection;
