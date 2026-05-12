import { Injectable } from '@nestjs/common';
import { ENV } from 'src/config/env';
import { SignJWT, jwtVerify } from 'jose';

@Injectable()
export class JwtService {
  private readonly secret: Uint8Array;
  private readonly algorithm = 'HS256';

  constructor() {
    const secretKey = ENV.JWT.SECRET;

    if (!secretKey || secretKey.length < 32) {
      throw new Error(
        'JWT_SECRET must be at least 32 characters. Set it in .env file.',
      );
    }

    this.secret = new TextEncoder().encode(secretKey);
  }

  async sign(payload: { sub: string; username: string }): Promise<string> {
    const token = await new SignJWT(payload)
      .setProtectedHeader({ alg: this.algorithm })
      .setIssuedAt()
      .setExpirationTime(ENV.JWT.ACCESSTOKENTIME)
      .sign(this.secret);

    return token;
  }

  async verify(token: string): Promise<any> {
    try {
      const verified = await jwtVerify(token, this.secret);
      return verified.payload;
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }
}
