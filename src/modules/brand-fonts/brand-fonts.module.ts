import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BrandsModule } from '../brands/brands.module';
import { BrandFontsController } from './brand-fonts.controller';
import { BrandFont } from './entities/brand-font.entity';
import { BrandFontsStorageService } from './services/brand-fonts-storage.service';
import { BrandFontsRepository } from './services/brand-fonts.repository';
import { BrandFontsService } from './services/brand-fonts.service';

@Module({
  imports: [TypeOrmModule.forFeature([BrandFont]), BrandsModule],
  controllers: [BrandFontsController],
  providers: [
    BrandFontsService,
    BrandFontsRepository,
    BrandFontsStorageService,
  ],
})
export class BrandFontsModule {}
