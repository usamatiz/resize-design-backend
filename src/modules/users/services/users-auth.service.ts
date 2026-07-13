import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailService } from '../../../mail/mail.service';
import { SupabaseService } from '../../../supabase/supabase.service';
import { UserRole } from '../entities/user-role.enum';

/**
 * Wraps Supabase Auth admin calls + delivers invitation emails through the
 * app-owned MailService (Resend), bypassing Supabase's built-in SMTP.
 */
@Injectable()
export class UsersAuthService {
  private readonly logger = new Logger(UsersAuthService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly config: ConfigService,
    private readonly mail: MailService,
  ) {}

  /**
   * 1. Ask Supabase to create the auth user and return an invite link
   *    (`generateLink` does NOT send an email).
   * 2. Deliver our own invitation email via Resend.
   * The auth user is created regardless of email success — the caller is
   * responsible for compensating (deleting) if downstream steps fail.
   */
  async inviteByEmail(
    email: string,
    fullName: string,
    role: UserRole,
  ): Promise<{ authId: string }> {
    const appUrl = this.config.getOrThrow<string>('app.url');
    const redirectPath = this.config.getOrThrow<string>(
      'app.inviteRedirectPath',
    );

    const { data, error } = await this.supabase.admin.auth.admin.generateLink({
      type: 'invite',
      email,
      options: {
        data: { full_name: fullName, role },
        redirectTo: `${appUrl}${redirectPath}`,
      },
    });

    const tokenHash = data.properties?.hashed_token;
    if (error || !data.user || !tokenHash) {
      this.logger.error(
        `Supabase generateLink(invite) failed for ${email}: ${error?.message}`,
      );
      throw new Error(error?.message ?? 'Failed to prepare invitation');
    }

    const apiUrl = this.config.getOrThrow<string>('app.apiUrl');
    const acceptUrl = `${apiUrl}/auth/invite/accept?token_hash=${encodeURIComponent(tokenHash)}`;

    try {
      await this.mail.sendInvitation({
        to: email,
        fullName,
        role,
        inviteLink: acceptUrl,
      });
    } catch (err) {
      // Roll back the auth user so a retry doesn't fail with "already registered".
      await this.deleteAuthUser(data.user.id).catch(() => undefined);
      throw err;
    }

    return { authId: data.user.id };
  }

  /**
   * Creates a Supabase auth user with a known password. Used only for the
   * bootstrap admin — normal users go through {@link inviteByEmail}.
   */
  async createWithPassword(
    email: string,
    password: string,
    fullName: string,
    role: UserRole,
  ): Promise<{ authId: string }> {
    const { data, error } = await this.supabase.admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName, role },
    });
    if (error || !data.user) {
      this.logger.error(
        `Supabase createUser failed for ${email}: ${error?.message}`,
      );
      throw new Error(error?.message ?? 'Failed to create auth user');
    }
    return { authId: data.user.id };
  }

  async verifyInviteToken(tokenHash: string): Promise<{ authId: string }> {
    const { data, error } = await this.supabase.anon.auth.verifyOtp({
      type: 'invite',
      token_hash: tokenHash,
    });
    if (error || !data.user) {
      this.logger.error(
        `Supabase verifyOtp(invite) failed: ${error?.message ?? 'no user'}`,
      );
      throw new Error(error?.message ?? 'Invalid or expired invite link');
    }
    return { authId: data.user.id };
  }

  async deleteAuthUser(authId: string): Promise<void> {
    const { error } = await this.supabase.admin.auth.admin.deleteUser(authId);
    if (error) throw new Error(error.message);
  }

  async updatePassword(authId: string, newPassword: string): Promise<void> {
    const { error } = await this.supabase.admin.auth.admin.updateUserById(
      authId,
      { password: newPassword },
    );
    if (error) {
      this.logger.error(
        `Supabase updateUserById(password) failed for ${authId}: ${error.message}`,
      );
      throw new Error(error.message);
    }
  }

  async updateFullName(authId: string, fullName: string): Promise<void> {
    const { error } = await this.supabase.admin.auth.admin.updateUserById(
      authId,
      { user_metadata: { full_name: fullName } },
    );
    if (error) {
      this.logger.error(
        `Supabase updateUserById(full_name) failed for ${authId}: ${error.message}`,
      );
      throw new Error(error.message);
    }
  }

  async verifyJwt(jwt: string): Promise<{ id: string; email: string | null }> {
    const { data, error } = await this.supabase.admin.auth.getUser(jwt);
    if (error || !data.user) {
      throw new Error(error?.message ?? 'Invalid token');
    }
    return { id: data.user.id, email: data.user.email ?? null };
  }

  async signInWithPassword(
    email: string,
    password: string,
  ): Promise<{ accessToken: string; refreshToken: string; authId: string }> {
    const { data, error } = await this.supabase.anon.auth.signInWithPassword({
      email,
      password,
    });
    if (error || !data.session || !data.user) {
      throw new Error(error?.message ?? 'Invalid credentials');
    }
    return {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      authId: data.user.id,
    };
  }
}
