import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createHash, timingSafeEqual } from 'crypto';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  private constantTimeEqual(candidate: string, expected: string): boolean {
    const candidateHash = createHash('sha256').update(candidate).digest();
    const expectedHash = createHash('sha256').update(expected).digest();
    return timingSafeEqual(candidateHash, expectedHash);
  }

  validateAdmin(username: string, password: string) {
    const expectedUsername = this.config.getOrThrow<string>('ADMIN_USERNAME');
    const expectedPassword = this.config.getOrThrow<string>('ADMIN_PASSWORD');
    const validUsername = this.constantTimeEqual(username, expectedUsername);
    const validPassword = this.constantTimeEqual(password, expectedPassword);
    if (!validUsername || !validPassword) return null;
    return { username: expectedUsername, sub: 'admin' };
  }

  async login(username: string, password: string) {
    const user = this.validateAdmin(username, password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { username: user.username, sub: user.sub };
    return { access_token: await this.jwtService.signAsync(payload) };
  }
}
