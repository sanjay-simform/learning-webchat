import { ENV } from '../config/env';
import { DataSource, DataSourceOptions } from 'typeorm';

const config = {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  type: ENV.DB.TYPE as any,
  host: ENV.DB.HOST,
  port: ENV.DB.PORT,
  username: ENV.DB.USERNAME,
  password: ENV.DB.PASSWORD,
  database: ENV.DB.DATABASE,
  autoLoadEntities: true,
  entities: ['dist/**/**/**/*.schema{.ts,.js}'],
  synchronize: false,
  migrations: ['dist/**/migrations/*{.ts,.js}'],
  logging: true,
  extra: {
    ssl: {
      rejectUnauthorized: false,
    },
  },
  migrationsTableName: 'migrations',
};
const connectionSource = new DataSource(config as DataSourceOptions);
export default connectionSource;
