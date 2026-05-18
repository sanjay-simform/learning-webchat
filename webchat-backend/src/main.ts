import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { WsAdapter } from '@nestjs/platform-ws';
import { AppModule } from './app.module';
import { ENV } from './config/env';
import { readFileSync } from 'fs';
import { join } from 'path';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, {
    // httpsOptions: {
    //   key: readFileSync('./cert/key.pem'),
    //   cert: readFileSync('./cert/cert.pem'),
    // },
  });
  app.useWebSocketAdapter(new WsAdapter(app));

  // Enable CORS
  app.enableCors({
    origin: [
      ENV.FRONTEND_URL,
      'https://172.16.4.239:5173',
      'http://localhost:5173',
      'https://unupbraided-leora-scalled.ngrok-free.dev',
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
  });
  app.setGlobalPrefix('api');
  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // app.get(
  //   () => /^(?!\/api|\/upload).*/,
  //   (_, res) => {
  //     res.sendFile(join(__dirname, '..', '..', 'dist', 'index.html'));
  //   },
  // );

  const port = ENV.PORT ?? 3000;
  await app.listen(port);
  logger.log(`Application running on port ${port}`);
}
bootstrap();
