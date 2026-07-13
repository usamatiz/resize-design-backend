import { IsEmail, IsEnum, IsString, MinLength } from 'class-validator';
import { UserRole } from '../entities/user-role.enum';

export class InviteUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(1)
  fullName: string;

  @IsEnum(UserRole)
  role: UserRole;
}
