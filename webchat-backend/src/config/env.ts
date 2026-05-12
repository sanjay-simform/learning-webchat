import { config } from 'dotenv';
import { existsSync } from 'fs';
import * as path from 'path';

function initConfig() {
  // const env = process.env.NODE_ENV || "dev";
  // const envFile = env === "prod" ? ".env" : `.env.${env}`;
  const envFile = '.env';
  const envPath = path.resolve(process.cwd(), envFile);
  if (existsSync(envPath)) {
    console.log(`Loading environment variables from: ${envPath}`);
    config({ path: envPath });
  }
}

initConfig();
const getEnvVariable = (key: string, defaultValue?: string) => {
  if (process.env[key]) return process.env[key];
  else if (defaultValue) return defaultValue;
  else {
    throw new Error(`Environment Variable for ${key} not found `);
  }
};

const ENV = {
  PORT: Number(getEnvVariable('PORT', '4001')),
  BCRYPT_SALT: Number(getEnvVariable('BCRYPT_SALT', '10')),
  FRONTEND_URL: getEnvVariable('FRONTEND_URL'),
  DB: {
    // URL: getEnvVariable('DB_URL'),
    TYPE: getEnvVariable('DB_TYPE'),
    HOST: getEnvVariable('DB_HOST'),
    PORT: Number(getEnvVariable('DB_PORT')),
    USERNAME: getEnvVariable('DB_USERNAME'),
    PASSWORD: getEnvVariable('DB_PASSWORD'),
    DATABASE: getEnvVariable('DB_DATABASE'),
    SSL: getEnvVariable('DB_SSL', 'false') === 'true',
  },
  JWT: {
    SECRET: getEnvVariable('JWT_SECRET'),
    ACCESSTOKENTIME: getEnvVariable('JWT_ACCESSTOKENTIME', '1d'),
    REFRESHTOKENTIME: getEnvVariable('JWT_REFRESHACCESSTOKENTIME', '15d'),
  },
  REDIS: {
    HOST: getEnvVariable('REDIS_HOST', 'localhost'),
    PORT: Number(getEnvVariable('REDIS_PORT', '6379')),
    PASSWORD: getEnvVariable('REDIS_PASSWORD', ''),
    SSL: getEnvVariable('REDIS_SSL', 'false') === 'true',
  },
  isDev: process.env.NODE_ENV === 'dev',
  isStage: process.env.NODE_ENV === 'stage',
  isProd: process.env.NODE_ENV === 'prod',
};

export { initConfig, ENV };
