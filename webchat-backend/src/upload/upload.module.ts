import { Module } from '@nestjs/common';
import { UploadService } from './upload.service';
import { UploadController } from './upload.controller';
import { MulterModule } from '@nestjs/platform-express/multer/multer.module';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { SharedModule } from 'src/shared/shared.module';

@Module({
  imports: [MulterModule.register({}), SharedModule],
  controllers: [UploadController],
  providers: [UploadService, JwtAuthGuard],
})
export class UploadModule {}
