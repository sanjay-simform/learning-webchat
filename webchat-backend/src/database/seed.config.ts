import { DataSource, DataSourceOptions } from 'typeorm';

import { ENV } from '../config/env';

const config = {
  type: ENV.DB.TYPE as any,
  host: ENV.DB.HOST,
  port: ENV.DB.PORT,
  username: ENV.DB.USERNAME,
  password: ENV.DB.PASSWORD,
  database: ENV.DB.DATABASE,
  autoLoadEntities: true,
  entities: ['dist/**/**/**/*.schema{.ts,.js}'],
  synchronize: false,
  migrations: ['dist/**/seeds/*{.ts,.js}'],
  logging: true,
  extra: {
    ssl: {
      rejectUnauthorized: false,
    },
  },
  migrationsTableName: 'seeds',
};
const connectionSource = new DataSource(config as DataSourceOptions);
export default connectionSource;
