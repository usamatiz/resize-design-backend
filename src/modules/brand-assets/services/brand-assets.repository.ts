import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository } from 'typeorm';
import { BrandAsset } from '../entities/brand-asset.entity';

@Injectable()
export class BrandAssetsRepository {
  constructor(
    @InjectRepository(BrandAsset)
    private readonly repo: Repository<BrandAsset>,
  ) {}

  listByBrand(brandId: string): Promise<BrandAsset[]> {
    return this.repo.find({
      where: { brandId },
      order: { createdAt: 'DESC' },
    });
  }

  findById(id: string): Promise<BrandAsset | null> {
    return this.repo.findOne({ where: { id } });
  }

  create(data: DeepPartial<BrandAsset>): Promise<BrandAsset> {
    return this.repo.save(this.repo.create(data));
  }

  async remove(asset: BrandAsset): Promise<void> {
    await this.repo.remove(asset);
  }
}
