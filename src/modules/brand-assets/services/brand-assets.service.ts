import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { BrandsService } from '../../brands/services/brands.service';
import { BrandAsset } from '../entities/brand-asset.entity';
import { BrandAssetsStorageService } from './brand-assets-storage.service';
import { BrandAssetsRepository } from './brand-assets.repository';

interface AssetFile {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;
}

@Injectable()
export class BrandAssetsService {
  private readonly logger = new Logger(BrandAssetsService.name);

  constructor(
    private readonly brands: BrandsService,
    private readonly repo: BrandAssetsRepository,
    private readonly storage: BrandAssetsStorageService,
  ) {}

  async list(brandId: string): Promise<BrandAsset[]> {
    await this.brands.findOne(brandId);
    return this.repo.listByBrand(brandId);
  }

  async upload(
    brandId: string,
    file: AssetFile,
    uploadedBy: string | null,
  ): Promise<BrandAsset> {
    await this.brands.findOne(brandId);

    const uploaded = await this.storage.uploadAsset(brandId, file);

    try {
      return await this.repo.create({
        brandId,
        storagePath: uploaded.path,
        publicUrl: uploaded.publicUrl,
        fileName: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        uploadedBy,
      });
    } catch (err) {
      await this.storage.deleteAsset(uploaded.path).catch(() => undefined);
      throw err;
    }
  }

  async delete(brandId: string, assetId: string): Promise<void> {
    const asset = await this.repo.findById(assetId);
    if (!asset) throw new NotFoundException(`Asset ${assetId} not found`);
    if (asset.brandId !== brandId) {
      throw new ForbiddenException('Asset does not belong to this brand');
    }

    await this.storage.deleteAsset(asset.storagePath).catch((err: Error) => {
      this.logger.warn(
        `Failed to delete storage object ${asset.storagePath}: ${err.message}`,
      );
    });
    await this.repo.remove(asset);
  }
}
