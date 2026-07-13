import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { UsersAuthService } from '../../users/services/users-auth.service';
import { UsersService } from '../../users/services/users.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly usersAuth: UsersAuthService,
    private readonly users: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest<Request>();
    const token = this.extractBearer(req);
    if (!token) throw new UnauthorizedException('Missing bearer token');

    let authUser: { id: string };
    try {
      authUser = await this.usersAuth.verifyJwt(token);
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }

    const appUser = await this.users.findBySupabaseAuthId(authUser.id);
    if (!appUser) throw new UnauthorizedException('User profile not found');

    (req as unknown as { user: unknown }).user = appUser;
    return true;
  }

  private extractBearer(req: Request): string | null {
    const header = req.headers.authorization;
    if (!header) return null;
    const [scheme, token] = header.split(' ');
    if (scheme?.toLowerCase() !== 'bearer' || !token) return null;
    return token;
  }
}
