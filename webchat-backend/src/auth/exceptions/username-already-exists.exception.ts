import { HttpException, HttpStatus } from '@nestjs/common';

export class UsernameAlreadyExistsException extends HttpException {
  constructor(message?: string) {
    super(message || 'Username is already taken', HttpStatus.CONFLICT);
  }
}
