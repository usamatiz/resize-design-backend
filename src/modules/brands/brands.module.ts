import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BrandsController } from './brands.controller';
import { Brand } from './entities/brand.entity';
import { BrandsStorageService } from './services/brands-storage.service';
import { BrandsRepository } from './services/brands.repository';
import { BrandsService } from './services/brands.service';

@Module({
  imports: [TypeOrmModule.forFeature([Brand])],
  controllers: [BrandsController],
  providers: [BrandsService, BrandsRepository, BrandsStorageService],
  exports: [BrandsService],
})
export class BrandsModule {}
