import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { UserRole } from '../entities/user-role.enum';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  fullName?: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}
