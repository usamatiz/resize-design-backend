import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import appConfig from './config/app.config';
import databaseConfig from './config/database.config';
import { validateEnv } from './config/env.validation';
import mailConfig from './config/mail.config';
import supabaseConfig from './config/supabase.config';
import { DatabaseModule } from './database/database.module';
import { MailModule } from './mail/mail.module';
import { AuthModule } from './modules/auth/auth.module';
import { BrandAssetsModule } from './modules/brand-assets/brand-assets.module';
import { BrandFontsModule } from './modules/brand-fonts/brand-fonts.module';
import { BrandsModule } from './modules/brands/brands.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { UsersModule } from './modules/users/users.module';
import { SupabaseModule } from './supabase/supabase.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      load: [appConfig, databaseConfig, supabaseConfig, mailConfig],
      validate: validateEnv,
    }),
    DatabaseModule,
    SupabaseModule,
    MailModule,
    UsersModule,
    AuthModule,
    BrandsModule,
    BrandAssetsModule,
    BrandFontsModule,
    ProjectsModule,
    DashboardModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
