import { Global, Module } from '@nestjs/common';
import { ENV } from 'src/config/env';
import { DataSource } from 'typeorm';

const databaseProviders = [
  {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    provide: DataSource,
    useFactory: () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
      const dataSource = new DataSource({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        type: ENV.DB.TYPE as any,
        host: ENV.DB.HOST,
        port: ENV.DB.PORT,
        username: ENV.DB.USERNAME,
        password: ENV.DB.PASSWORD,
        database: ENV.DB.DATABASE,
        synchronize: false,
        logging: false,
        entities: [__dirname + '/schemas/*.schema{.ts,.js}'],
        migrations: [__dirname + '/migrations/*{.ts,.js}'],
        pool: {
          max: 20,
          min: 5,
          idleTimeout: 30000,
        },
        ssl: ENV.DB.SSL,
      });
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      return dataSource.initialize();
    },
  },
];

@Global()
@Module({
  imports: [],
  providers: [...databaseProviders],
  exports: [...databaseProviders],
})
export class DatabaseModule {}
