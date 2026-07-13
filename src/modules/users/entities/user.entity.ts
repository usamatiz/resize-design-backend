import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserRole } from './user-role.enum';
import { UserStatus } from './user-status.enum';

@Entity({ name: 'users' })
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ type: 'text' })
  email: string;

  @Column({ name: 'full_name', type: 'text' })
  fullName: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    enumName: 'user_role',
    default: UserRole.VIEWER,
  })
  role: UserRole;

  @Column({
    type: 'enum',
    enum: UserStatus,
    enumName: 'user_status',
    default: UserStatus.INVITED,
  })
  status: UserStatus;

  /** Supabase auth user id (from auth.users.id). Set when the auth user is created. */
  @Index({ unique: true, where: 'supabase_auth_id IS NOT NULL' })
  @Column({ name: 'supabase_auth_id', type: 'uuid', nullable: true })
  supabaseAuthId: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
