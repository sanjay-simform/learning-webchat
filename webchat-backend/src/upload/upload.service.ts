import { Injectable } from '@nestjs/common';
import { UPLOAD_SERVE_ROOT } from './constant/multer.contant';

@Injectable()
export class UploadService {
  buildImageUrl(userId: string, filename: string): string {
    return `${UPLOAD_SERVE_ROOT}/${encodeURIComponent(userId)}/${encodeURIComponent(filename)}`;
  }
}
