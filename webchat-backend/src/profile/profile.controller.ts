import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import { ProfileService } from './profile.service';
import { type Request } from 'express';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';

@Controller('profile')
@UseGuards(JwtAuthGuard)
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get()
  async getUserProfile(@Req() req: Request) {
    const userId = req.user?.id;
    const data = await this.profileService.getUserProfile(userId);
    return data;
  }

  @Patch()
  async updateUserProfile(
    @Req() req: Request,
    @Body() updateProfileDto: UpdateProfileDto,
  ) {
    const userId = req.user?.id;
    const data = await this.profileService.updateUserProfile(
      userId,
      updateProfileDto,
    );
    return data;
  }
}
