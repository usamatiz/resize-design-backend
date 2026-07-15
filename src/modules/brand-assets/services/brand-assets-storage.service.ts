import {
  BadRequestException,
  Injectable,
  Logger,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { extname } from 'path';
import { SupabaseService } from '../../../supabase/supabase.service';

export interface UploadedAsset {
  path: string;
  publicUrl: string;
}

const BUCKET = 'brand-assets';
const ALLOWED_MIME = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/svg+xml',
]);
const MAX_BYTES = 10 * 1024 * 1024;

@Injectable()
export class BrandAssetsStorageService {
  private readonly logger = new Logger(BrandAssetsStorageService.name);

  constructor(private readonly supabase: SupabaseService) {}

  async uploadAsset(
    brandId: string,
    file: {
      buffer: Buffer;
      mimetype: string;
      originalname: string;
      size: number;
    },
  ): Promise<UploadedAsset> {
    if (!file?.buffer) {
      throw new BadRequestException('Asset file is required');
    }
    if (!ALLOWED_MIME.has(file.mimetype)) {
      throw new UnsupportedMediaTypeException(
        `Unsupported asset type: ${file.mimetype}`,
      );
    }
    if (file.size > MAX_BYTES) {
      throw new BadRequestException(
        `Asset exceeds max size of ${MAX_BYTES} bytes`,
      );
    }

    const ext = extname(file.originalname).toLowerCase() || '.png';
    const path = `${brandId}/${randomUUID()}${ext}`;

    const { error } = await this.supabase.admin.storage
      .from(BUCKET)
      .upload(path, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (error) {
      this.logger.error(`Supabase storage upload failed: ${error.message}`);
      throw new Error(error.message);
    }

    const { data } = this.supabase.admin.storage
      .from(BUCKET)
      .getPublicUrl(path);

    return { path, publicUrl: data.publicUrl };
  }

  async deleteAsset(path: string): Promise<void> {
    const { error } = await this.supabase.admin.storage
      .from(BUCKET)
      .remove([path]);
    if (error) throw new Error(error.message);
  }
}
