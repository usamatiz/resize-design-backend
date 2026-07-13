import { Injectable, UnauthorizedException } from '@nestjs/common';
import { User } from '../users/entities/user.entity';
import { UsersAuthService } from '../users/services/users-auth.service';
import { UsersService } from '../users/services/users.service';

export interface LoginResult {
  accessToken: string;
  refreshToken: string;
  user: User;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersAuth: UsersAuthService,
    private readonly users: UsersService,
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
}
