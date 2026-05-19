import {
  BadRequestException,
  Controller,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { UploadService } from './upload.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { type Request } from 'express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { mkdirSync } from 'fs';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { MULTER_DESTINATION_FOLDER } from './constant/multer.contant';
import { randomBytes } from 'crypto';

const uploadRootPath = join(__dirname, '..', '..', MULTER_DESTINATION_FOLDER);

const imageUploadStorage = diskStorage({
  destination: (req, _file, cb) => {
    const userId = req.user?.id;
    if (!userId) {
      cb(new BadRequestException('Missing authenticated user'), uploadRootPath);
      return;
    }

    const userDirectory = join(uploadRootPath, userId);
    mkdirSync(userDirectory, { recursive: true });
    cb(null, userDirectory);
  },
  filename: (_req, file, cb) => {
    const extension = resolveImageExtension(file.originalname, file.mimetype);
    cb(null, `${randomBytes(16).toString('hex')}${extension}`);
  },
});

@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('/image')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: imageUploadStorage,
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        // if (!file.mimetype.startsWith('image/')) {
        //   cb(new BadRequestException('Only image files are allowed'), false);
        //   return;
        // }

        cb(null, true);
      },
    }),
  )
  uploadImage(
    @Req() req: Request,
    @UploadedFile() file: Express.Multer.File,
  ): { url: string } {
    if (!file) {
      throw new BadRequestException('Image file is required');
    }

    const userId = req.user?.id;
    if (!userId) {
      throw new BadRequestException('Missing authenticated user');
    }

    return {
      url: this.uploadService.buildImageUrl(userId, file.filename),
    };
  }
}

const IMAGE_EXTENSION_BY_MIME: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'image/avif': '.avif',
};

function resolveImageExtension(originalName: string, mimetype: string): string {
  const extension = extname(originalName).toLowerCase();
  if (extension) {
    return extension;
  }

  return IMAGE_EXTENSION_BY_MIME[mimetype] ?? '.img';
}
