import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository } from 'typeorm';
import { BrandFont } from '../entities/brand-font.entity';

@Injectable()
export class BrandFontsRepository {
  constructor(
    @InjectRepository(BrandFont)
    private readonly repo: Repository<BrandFont>,
  ) {}

  listByBrand(brandId: string): Promise<BrandFont[]> {
    return this.repo.find({
      where: { brandId },
      order: { createdAt: 'DESC' },
    });
  }

  findById(id: string): Promise<BrandFont | null> {
    return this.repo.findOne({ where: { id } });
  }

  findByBrandAndFamily(
    brandId: string,
    fontFamily: string,
  ): Promise<BrandFont | null> {
    return this.repo.findOne({ where: { brandId, fontFamily } });
  }

  create(data: DeepPartial<BrandFont>): Promise<BrandFont> {
    return this.repo.save(this.repo.create(data));
  }

  async remove(font: BrandFont): Promise<void> {
    await this.repo.remove(font);
  }
}
