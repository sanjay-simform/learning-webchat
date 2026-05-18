import { Injectable } from '@nestjs/common';
import { User } from 'src/database/schemas/user.schema';
import { UserService } from 'src/user/services/user.service';
import { PasswordService } from 'src/shared/services/password.service';
import { UsernameService } from 'src/shared/services/username.service';
import { JwtService } from 'src/shared/services/jwt.service';
import { CacheService } from 'src/redis/services/cache.service';
import { BloomFilterService } from 'src/redis/services/bloom-filter.service';
import { CryptoDataDto, SignupRequestDto } from '../dtos/signup-request.dto';
import { LoginRequestDto } from '../dtos/login-request.dto';
import { UsernameAlreadyExistsException } from '../exceptions/username-already-exists.exception';
import { InvalidCredentialsException } from '../exceptions/invalid-credentials.exception';

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private passwordService: PasswordService,
    private usernameService: UsernameService,
    private jwtService: JwtService,
    private cacheService: CacheService,
    private bloomFilterService: BloomFilterService,
  ) {}

  async signup(dto: SignupRequestDto): Promise<{ user: User; token: string }> {
    // 1. Normalize username
    const normalizedUsername = this.usernameService.normalize(dto.username);

    // 2. Hash password
    const passwordHash = await this.passwordService.hash(dto.password);

    // 3. Insert into DB (unique constraint ensures race-condition safety)
    let user: User;
    try {
      user = await this.userService.create({
        username_normalized: normalizedUsername,
        username_original: dto.username,
        password_hash: passwordHash,
        cryptoData: dto.cryptoData,
      });
      await this.userService.createProfileForUser({
        userId: user.id,
        displayName: dto.username,
      });
    } catch (error) {
      // Check for unique constraint violation
      if (error.code === '23505' || error.message.includes('duplicate key')) {
        throw new UsernameAlreadyExistsException();
      }
      throw error;
    }

    // 4. Add to Bloom filter (non-blocking)
    this.bloomFilterService.add(normalizedUsername).catch((err) => {
      console.error('Bloom filter add failed:', err);
    });

    // 5. Cache user
    await this.cacheService.setUser(normalizedUsername, {
      id: user.id,
      username: normalizedUsername,
      password: passwordHash,
    });

    // 6. Generate JWT
    const token = await this.jwtService.sign({
      sub: user.id,
      username: normalizedUsername,
    });

    return { user, token };
  }

  async login(dto: LoginRequestDto): Promise<{
    user: { id: string; username: string; cryptoData: CryptoDataDto };
    token: string;
  }> {
    // 1. Normalize username
    const normalizedUsername = this.usernameService.normalize(dto.username);

    // 2. Check Bloom Filter (HOT PATH OPTIMIZATION)
    const mightExist =
      await this.bloomFilterService.mightExist(normalizedUsername);
    if (!mightExist) {
      // Bloom says definitely NOT in DB - return 401 immediately
      throw new InvalidCredentialsException();
    }

    // 3. Try Redis cache first (for password hash verification)
    const cachedPasswordHash =
      await this.cacheService.getUser(normalizedUsername);

    if (!cachedPasswordHash) {
      // Cache miss, query database
      const user = await this.userService.findByUsername(normalizedUsername);
      if (!user) {
        throw new InvalidCredentialsException();
      }

      // 4. Verify password
      const passwordValid = await this.passwordService.verify(
        dto.password,
        user.password,
      );
      if (!passwordValid) {
        throw new InvalidCredentialsException();
      }

      // 5. Cache user for future lookups
      await this.cacheService.setUser(normalizedUsername, {
        id: user.id,
        username: normalizedUsername,
        password: user.password,
      });

      // 7. Generate JWT
      const token = await this.jwtService.sign({
        sub: user.id,
        username: normalizedUsername,
      });

      return {
        user: {
          id: user.id,
          username: normalizedUsername,
          cryptoData: {
            salt: user.salt,
            dek: {
              cipherText: user.dek_cipher_text,
              iv: user.dek_iv,
            },
            rsa: {
              publicKey: user.rsa_public_key,
              privateKey: {
                cipherText: user.rsa_private_cipher_text,
                iv: user.rsa_private_iv,
              },
            },
          },
        },
        token,
      };
    }

    // 4. Verify password with cached hash
    const passwordValid = await this.passwordService.verify(
      dto.password,
      cachedPasswordHash.password,
    );
    if (!passwordValid) {
      throw new InvalidCredentialsException();
    }

    // 5. Fetch full user from DB
    const user = await this.userService.findByUsername(normalizedUsername);
    if (!user) {
      throw new InvalidCredentialsException();
    }

    // 7. Generate JWT
    const token = await this.jwtService.sign({
      sub: user.id,
      username: normalizedUsername,
    });

    return {
      user: {
        id: user.id,
        username: normalizedUsername,
        cryptoData: {
          salt: user.salt,
          dek: {
            cipherText: user.dek_cipher_text,
            iv: user.dek_iv,
          },
          rsa: {
            publicKey: user.rsa_public_key,
            privateKey: {
              cipherText: user.rsa_private_cipher_text,
              iv: user.rsa_private_iv,
            },
          },
        },
      },
      token,
    };
  }
}
