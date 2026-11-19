import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

function extractCookieToken(request: unknown): string | null {
  if (
    typeof request !== 'object' ||
    request === null ||
    !('cookies' in request)
  )
    return null;
  const cookies = request.cookies;
  if (
    typeof cookies !== 'object' ||
    cookies === null ||
    !('access_token' in cookies)
  )
    return null;
  const token = cookies.access_token;
  return typeof token === 'string' ? token : null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        extractCookieToken,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  validate(payload: { sub: string; username: string }) {
    if (!payload?.sub || !payload?.username) {
      throw new UnauthorizedException();
    }

    return { id: payload.sub, username: payload.username };
  }
}
