import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseEnumPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { ChangePasswordDto } from './dto/change-password.dto';
import { InviteUserDto } from './dto/invite-user.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserRole } from './entities/user-role.enum';
import { UserStatus } from './entities/user-status.enum';
import { User } from './entities/user.entity';
import { UsersService } from './services/users.service';

@ApiTags('users')
@ApiBearerAuth('access-token')
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Post('invite')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Send invitation email (admin only)' })
  invite(@Body() dto: InviteUserDto): Promise<User> {
    return this.users.invite(dto);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update own profile (full name)' })
  updateOwnProfile(
    @CurrentUser() user: User,
    @Body() dto: UpdateProfileDto,
  ): Promise<User> {
    return this.users.updateOwnProfile(user, dto);
  }

  @Patch('me/password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change own password' })
  changeOwnPassword(
    @CurrentUser() user: User,
    @Body() dto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    return this.users.changeOwnPassword(user, dto);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  @ApiOperation({
    summary:
      'List users (admin, editor). Filter with ?status=invited or ?status=active.',
  })
  @ApiQuery({ name: 'status', required: false, enum: UserStatus })
  findAll(
    @Query('status', new ParseEnumPipe(UserStatus, { optional: true }))
    status?: UserStatus,
  ): Promise<User[]> {
    return this.users.findAll(status);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  @ApiOperation({ summary: 'Get a user by id (admin, editor)' })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<User> {
    return this.users.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update a user (admin only)' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
  ): Promise<User> {
    return this.users.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a user (admin only)' })
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.users.remove(id);
  }
}
