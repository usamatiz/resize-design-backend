import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { dataSourceOptions } from './data-source';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService): TypeOrmModuleOptions => ({
        ...dataSourceOptions,
        url: config.getOrThrow<string>('database.url'),
        ssl: config.get<boolean | { rejectUnauthorized: boolean }>(
          'database.ssl',
        ),
        autoLoadEntities: true,
      }),
    }),
  ],
})
export class DatabaseModule {}
