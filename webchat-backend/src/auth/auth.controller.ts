import {
  Controller,
  Post,
  Get,
  Body,
  HttpCode,
  UseGuards,
  Req,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './services/auth.service';
import { SignupRequestDto } from './dtos/signup-request.dto';
import { LoginRequestDto } from './dtos/login-request.dto';
import { AuthResponseDto, UserDto } from './dtos/auth-response.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { type Request } from 'express';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('signup')
  @HttpCode(201)
  @Throttle({ default: { limit: 5, ttl: 3600 } })
  async signup(@Body() dto: SignupRequestDto): Promise<AuthResponseDto> {
    const { user, token } = await this.authService.signup(dto);

    return {
      access_token: token,
      user: {
        id: user.id,
        username: user.username,
      },
    };
  }

  @Post('login')
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 3600 } })
  async login(@Body() dto: LoginRequestDto): Promise<AuthResponseDto> {
    const { user, token } = await this.authService.login(dto);

    return {
      access_token: token,
      user: {
        id: user.id,
        username: user.username,
      },
    };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getCurrentUser(@Req() req: Request): UserDto {
    return {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      id: req.user.id,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      username: req.user.username,
    };
  }
}
