import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UsersAuthService } from './services/users-auth.service';
import { UsersRepository } from './services/users.repository';
import { UsersService } from './services/users.service';
import { UsersController } from './users.controller';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [UsersController],
  providers: [UsersService, UsersRepository, UsersAuthService],
  exports: [UsersService, UsersAuthService],
})
export class UsersModule {}
