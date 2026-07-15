import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BrandsModule } from '../brands/brands.module';
import { BrandAssetsController } from './brand-assets.controller';
import { BrandAsset } from './entities/brand-asset.entity';
import { BrandAssetsStorageService } from './services/brand-assets-storage.service';
import { BrandAssetsRepository } from './services/brand-assets.repository';
import { BrandAssetsService } from './services/brand-assets.service';

@Module({
  imports: [TypeOrmModule.forFeature([BrandAsset]), BrandsModule],
  controllers: [BrandAssetsController],
  providers: [
    BrandAssetsService,
    BrandAssetsRepository,
    BrandAssetsStorageService,
  ],
})
export class BrandAssetsModule {}
