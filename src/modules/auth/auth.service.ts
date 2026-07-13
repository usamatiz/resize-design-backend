import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import {
  createInviteSetupToken,
  verifyInviteSetupToken,
} from './utils/invite-setup-token';
import { User } from '../users/entities/user.entity';
import { UsersAuthService } from '../users/services/users-auth.service';
import { UsersService } from '../users/services/users.service';
import { SetPasswordDto } from './dto/set-password.dto';

export interface LoginResult {
  accessToken: string;
  refreshToken: string;
  user: User;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersAuth: UsersAuthService,
    private readonly users: UsersService,
    private readonly config: ConfigService,
  ) {}

  async login(email: string, password: string): Promise<LoginResult> {
    let session;
    try {
      session = await this.usersAuth.signInWithPassword(email, password);
    } catch {
      throw new UnauthorizedException('Invalid credentials');
    }

    const user = await this.users.findBySupabaseAuthId(session.authId);
    if (!user) {
      throw new UnauthorizedException(
        'Auth account has no linked user profile',
      );
    }

    return {
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
      user,
    };
  }

  async acceptInvite(
    tokenHash: string | undefined,
    res: Response,
  ): Promise<void> {
    const appUrl = this.config.getOrThrow<string>('app.url');
    const setPasswordPath =
      this.config.get<string>('app.inviteRedirectPath') ?? '/auth/set-password';

    const redirectWithError = () => {
      res.redirect(`${appUrl}${setPasswordPath}?error=invalid_invite`);
    };

    if (!tokenHash?.trim()) {
      redirectWithError();
      return;
    }

    try {
      const { authId } = await this.usersAuth.verifyInviteToken(
        tokenHash.trim(),
      );
      const secret = this.config.getOrThrow<string>('app.inviteSetupSecret');
      const setupToken = createInviteSetupToken(authId, secret);
      res.redirect(
        `${appUrl}${setPasswordPath}?token=${encodeURIComponent(setupToken)}`,
      );
    } catch (err: unknown) {
      this.logger.warn(
        `Invite accept failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      redirectWithError();
    }
  }

  async setPassword(dto: SetPasswordDto): Promise<{ message: string }> {
    if (dto.password !== dto.confirmPassword) {
      throw new BadRequestException('Password and confirm password do not match');
    }

    const secret = this.config.getOrThrow<string>('app.inviteSetupSecret');
    const authId = verifyInviteSetupToken(dto.token, secret);
    if (!authId) {
      throw new UnauthorizedException('Invalid or expired invite token');
    }

    try {
      await this.usersAuth.updatePassword(authId, dto.password);
    } catch (err) {
      throw new BadRequestException(
        err instanceof Error ? err.message : 'Failed to set password',
      );
    }

    return { message: 'Password set successfully' };
  }
}
