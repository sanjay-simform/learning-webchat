import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from 'src/database/schemas/user.schema';
import { CryptoDataDto } from 'src/auth/dtos/signup-request.dto';

export interface CreateUserInput {
  username_normalized: string;
  username_original: string;
  password_hash: string;
  cryptoData?: CryptoDataDto;
}

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async create(input: CreateUserInput): Promise<User> {
    const user = this.userRepository.create({
      username: input.username_normalized,
      password: input.password_hash,
      salt: input.cryptoData?.salt,
      dek_cipher_text: input.cryptoData?.dek.cipherText,
      dek_iv: input.cryptoData?.dek.iv,
      rsa_public_key: input.cryptoData?.rsa.publicKey,
      rsa_private_key: input.cryptoData?.rsa.privateKey,
    });

    return this.userRepository.save(user);
  }

  async findByUsername(username_normalized: string): Promise<{
    id: string;
    password: string;
  } | null> {
    return this.userRepository.findOne({
      where: {
        username: username_normalized,
      },
      select: ['id', 'password'],
    });
  }

  async findById(id: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: {
        id,
      },
    });
  }
}
