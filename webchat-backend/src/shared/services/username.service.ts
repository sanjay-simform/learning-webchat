import { Injectable, BadRequestException } from '@nestjs/common';

@Injectable()
export class UsernameService {
  readonly MIN_LENGTH = 3;
  readonly MAX_LENGTH = 64;
  readonly ALLOWED_REGEX = /^[a-z0-9_.-]+$/;

  normalize(username: string): string {
    if (!username || typeof username !== 'string') {
      throw new BadRequestException('Username must be a non-empty string');
    }

    // Trim, lowercase, collapse internal spaces
    let normalized = username.trim().toLowerCase();
    normalized = normalized.replace(/\s+/g, ' ').trim();

    // Validate length
    if (
      normalized.length < this.MIN_LENGTH ||
      normalized.length > this.MAX_LENGTH
    ) {
      throw new BadRequestException(
        `Username must be ${this.MIN_LENGTH}-${this.MAX_LENGTH} characters`,
      );
    }

    // Validate characters
    if (!this.ALLOWED_REGEX.test(normalized)) {
      throw new BadRequestException(
        'Username can only contain letters, numbers, underscore, hyphen, and period',
      );
    }

    return normalized;
  }

  isValid(username: string): boolean {
    try {
      this.normalize(username);
      return true;
    } catch {
      return false;
    }
  }
}
