import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/services/users.service';
import { AuthService, LoginResult } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import { BootstrapAdminDto } from './dto/bootstrap-admin.dto';
import { LoginDto } from './dto/login.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly users: UsersService,
  ) {}

  @Public()
  @Post('bootstrap-admin')
  @ApiOperation({
    summary: 'Create the first admin (only works when no admin exists)',
  })
  bootstrap(@Body() dto: BootstrapAdminDto): Promise<User> {
    return this.users.bootstrapAdmin(dto.email, dto.password, dto.fullName);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sign in with email + password' })
  login(@Body() dto: LoginDto): Promise<LoginResult> {
    return this.auth.login(dto.email, dto.password);
  }

  @Get('me')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Current authenticated user profile' })
  me(@CurrentUser() user: User): User {
    return user;
  }
}
