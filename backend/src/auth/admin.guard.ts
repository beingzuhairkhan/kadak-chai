import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';

type AdminRequest = Request & { user?: { username: string } };

@Injectable()
export class AdminGuard extends AuthGuard('jwt') implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const activated = await super.canActivate(context);
    if (activated === false) {
      throw new UnauthorizedException();
    }

    const req = context.switchToHttp().getRequest<AdminRequest>();
    const user = req.user;
    if (!user || user.username !== process.env.ADMIN_USERNAME) {
      throw new UnauthorizedException();
    }

    return true;
  }
}
