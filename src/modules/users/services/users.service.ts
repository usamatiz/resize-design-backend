import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ChangePasswordDto } from '../dto/change-password.dto';
import { InviteUserDto } from '../dto/invite-user.dto';
import { UpdateProfileDto } from '../dto/update-profile.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { UserRole } from '../entities/user-role.enum';
import { UserStatus } from '../entities/user-status.enum';
import { User } from '../entities/user.entity';
import { UsersAuthService } from './users-auth.service';
import { UsersRepository } from './users.repository';

@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepo: UsersRepository,
    private readonly usersAuth: UsersAuthService,
  ) {}

  /**
   * Invite a user via Supabase email. Creates the Supabase auth user first,
   * then the local users row. If the DB insert fails, roll back the auth user.
   */
  async invite(dto: InviteUserDto): Promise<User> {
    const existing = await this.usersRepo.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException(
        `User with email ${dto.email} already exists`,
      );
    }

    const { authId } = await this.usersAuth.inviteByEmail(
      dto.email,
      dto.fullName,
      dto.role,
    );

    try {
      return await this.usersRepo.create({
        email: dto.email,
        fullName: dto.fullName,
        role: dto.role,
        supabaseAuthId: authId,
        status: UserStatus.INVITED,
      });
    } catch (err) {
      await this.usersAuth.deleteAuthUser(authId).catch(() => undefined);
      throw err;
    }
  }

  /**
   * First-admin bootstrap. Only succeeds when no admin exists. Password is
   * required here (no invite email flow) so the first operator can log in
   * immediately. Subsequent users must come through {@link invite}.
   */
  async bootstrapAdmin(
    email: string,
    password: string,
    fullName: string,
  ): Promise<User> {
    const adminCount = await this.usersRepo.countByRole(UserRole.ADMIN);
    if (adminCount > 0) {
      throw new ConflictException('Admin already exists');
    }

    const { authId } = await this.usersAuth.createWithPassword(
      email,
      password,
      fullName,
      UserRole.ADMIN,
    );

    try {
      return await this.usersRepo.create({
        email,
        fullName,
        role: UserRole.ADMIN,
        supabaseAuthId: authId,
        status: UserStatus.ACTIVE,
      });
    } catch (err) {
      await this.usersAuth.deleteAuthUser(authId).catch(() => undefined);
      throw err;
    }
  }

  findAll(status?: UserStatus): Promise<User[]> {
    return this.usersRepo.findAll(status);
  }

  /**
   * Flip an invited user to active once they've set their password. Called
   * from the invite/set-password flow. Idempotent — already-active users pass
   * through unchanged.
   */
  async markActiveBySupabaseAuthId(authId: string): Promise<void> {
    const user = await this.usersRepo.findBySupabaseAuthId(authId);
    if (!user || user.status === UserStatus.ACTIVE) return;
    await this.usersRepo.update(user.id, { status: UserStatus.ACTIVE });
  }

  async findOne(id: string): Promise<User> {
    const user = await this.usersRepo.findById(id);
    if (!user) throw new NotFoundException(`User ${id} not found`);
    return user;
  }

  async findBySupabaseAuthId(authId: string): Promise<User | null> {
    return this.usersRepo.findBySupabaseAuthId(authId);
  }

  async update(id: string, dto: UpdateUserDto): Promise<User> {
    const existing = await this.findOne(id);
    const updated = await this.usersRepo.update(id, dto);
    if (!updated) throw new NotFoundException(`User ${id} not found`);

    if (
      dto.fullName !== undefined &&
      dto.fullName !== existing.fullName &&
      existing.supabaseAuthId
    ) {
      await this.usersAuth
        .updateFullName(existing.supabaseAuthId, dto.fullName)
        .catch(() => undefined);
    }

    return updated;
  }

  async updateOwnProfile(user: User, dto: UpdateProfileDto): Promise<User> {
    const updated = await this.usersRepo.update(user.id, {
      fullName: dto.fullName,
    });
    if (!updated) throw new NotFoundException(`User ${user.id} not found`);

    if (user.supabaseAuthId) {
      await this.usersAuth
        .updateFullName(user.supabaseAuthId, dto.fullName)
        .catch(() => undefined);
    }

    return updated;
  }

  async changeOwnPassword(
    user: User,
    dto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    if (dto.newPassword !== dto.confirmNewPassword) {
      throw new BadRequestException(
        'New password and confirm password do not match',
      );
    }
    if (dto.currentPassword === dto.newPassword) {
      throw new BadRequestException(
        'New password must be different from current password',
      );
    }
    if (!user.supabaseAuthId) {
      throw new BadRequestException('User has no linked auth account');
    }

    try {
      await this.usersAuth.signInWithPassword(user.email, dto.currentPassword);
    } catch {
      throw new UnauthorizedException('Current password is incorrect');
    }

    try {
      await this.usersAuth.updatePassword(user.supabaseAuthId, dto.newPassword);
    } catch (err) {
      throw new BadRequestException(
        err instanceof Error ? err.message : 'Failed to update password',
      );
    }

    return { message: 'Password updated successfully' };
  }

  async remove(id: string): Promise<void> {
    const user = await this.findOne(id);
    const deleted = await this.usersRepo.delete(id);
    if (!deleted) throw new NotFoundException(`User ${id} not found`);
    if (user.supabaseAuthId) {
      await this.usersAuth
        .deleteAuthUser(user.supabaseAuthId)
        .catch(() => undefined);
    }
  }
}
