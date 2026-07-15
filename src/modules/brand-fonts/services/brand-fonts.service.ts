import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { extname } from 'path';
import { BrandsService } from '../../brands/services/brands.service';
import { BrandFont } from '../entities/brand-font.entity';
import { BrandFontsStorageService } from './brand-fonts-storage.service';
import { BrandFontsRepository } from './brand-fonts.repository';

interface FontFile {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;
}

@Injectable()
export class BrandFontsService {
  private readonly logger = new Logger(BrandFontsService.name);

  constructor(
    private readonly brands: BrandsService,
    private readonly repo: BrandFontsRepository,
    private readonly storage: BrandFontsStorageService,
  ) {}

  async list(brandId: string): Promise<BrandFont[]> {
    await this.brands.findOne(brandId);
    return this.repo.listByBrand(brandId);
  }

  async upload(
    brandId: string,
    file: FontFile,
    fontFamilyInput: string | undefined,
    uploadedBy: string | null,
  ): Promise<BrandFont> {
    await this.brands.findOne(brandId);

    const fontFamily = (
      fontFamilyInput?.trim() || deriveFamilyFromFilename(file.originalname)
    ).trim();
    if (!fontFamily) {
      throw new NotFoundException('fontFamily could not be determined');
    }

    const clash = await this.repo.findByBrandAndFamily(brandId, fontFamily);
    if (clash) {
      throw new ConflictException(
        `Font "${fontFamily}" already exists for this brand`,
      );
    }

    const uploaded = await this.storage.uploadFont(brandId, file);

    try {
      return await this.repo.create({
        brandId,
        fontFamily,
        storagePath: uploaded.path,
        publicUrl: uploaded.publicUrl,
        fileName: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        uploadedBy,
      });
    } catch (err) {
      await this.storage.deleteFont(uploaded.path).catch(() => undefined);
      throw err;
    }
  }

  async delete(brandId: string, fontId: string): Promise<void> {
    const font = await this.repo.findById(fontId);
    if (!font) throw new NotFoundException(`Font ${fontId} not found`);
    if (font.brandId !== brandId) {
      throw new ForbiddenException('Font does not belong to this brand');
    }

    await this.storage.deleteFont(font.storagePath).catch((err: Error) => {
      this.logger.warn(
        `Failed to delete storage object ${font.storagePath}: ${err.message}`,
      );
    });
    await this.repo.remove(font);
  }
}

function deriveFamilyFromFilename(filename: string): string {
  const base = filename.replace(extname(filename), '');
  return base.replace(/[-_]+/g, ' ').trim();
}
