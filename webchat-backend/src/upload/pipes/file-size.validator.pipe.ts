import {
  BadRequestException,
  PipeTransform,
  Injectable,
  ArgumentMetadata,
} from '@nestjs/common';

@Injectable()
export class FileSizeValidationPipe implements PipeTransform {
  transform(value: any, _metadata: ArgumentMetadata) {
    // "value" is an object containing the file's attributes and metadata
    const tenMb = 10 * 1024 * 1024; // 10 MB in bytes
    if (value.size > tenMb) {
      throw new BadRequestException(
        'File size exceeds the maximum limit of 10 MB',
      );
    }
    return value;
  }
}
