import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import { LoginDto } from './dto/login.dto';
import { AuthService } from './auth.service';
import { ConfigService } from '@nestjs/config';

@Controller({ path: 'auth', version: '1' })
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Throttle({ default: { limit: 5, ttl: 15 * 60 * 1000 } })
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    this.assertSameOrigin(req);
    const token = await this.authService.login(dto.username, dto.password);
    res.cookie('access_token', token.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 8 * 60 * 60 * 1000,
    });
    return { success: true, message: 'Logged in successfully.' };
  }

  @Post('logout')
  logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    this.assertSameOrigin(req);
    res.clearCookie('access_token');
    return { success: true, message: 'Logged out successfully.' };
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  me(@Req() req: Request & { user?: { username: string } }) {
    return { user: req.user };
  }

  private assertSameOrigin(req: Request) {
    const origin = req.get('origin');
    if (origin !== this.config.getOrThrow<string>('FRONTEND_URL')) {
      throw new ForbiddenException('Invalid request origin.');
    }
  }
}
