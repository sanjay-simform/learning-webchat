import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { UserProfile } from 'src/database/schemas/user-profile.schema';
import { Repository } from 'typeorm';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class ProfileService {
  constructor(
    @InjectRepository(UserProfile)
    private readonly userProfileRepository: Repository<UserProfile>,
  ) {}

  async getUserProfile(userId: string): Promise<UserProfile | null> {
    return this.userProfileRepository.findOne({ where: { userId } });
  }

  async updateUserProfile(
    userId: string,
    updateData: UpdateProfileDto,
  ): Promise<UserProfile | null> {
    await this.userProfileRepository.update({ userId }, updateData);
    return await this.getUserProfile(userId);
  }
}
