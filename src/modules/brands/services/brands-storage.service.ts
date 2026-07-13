import {
  BadRequestException,
  Injectable,
  Logger,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { extname } from 'path';
import { SupabaseService } from '../../../supabase/supabase.service';

export interface UploadedLogo {
  path: string;
  publicUrl: string;
}

const BUCKET = 'brand-logos';
const ALLOWED_MIME = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/svg+xml',
]);
const MAX_BYTES = 5 * 1024 * 1024;

@Injectable()
export class BrandsStorageService {
  private readonly logger = new Logger(BrandsStorageService.name);

  constructor(private readonly supabase: SupabaseService) {}

  async uploadLogo(file: {
    buffer: Buffer;
    mimetype: string;
    originalname: string;
    size: number;
  }): Promise<UploadedLogo> {
    if (!file?.buffer) {
      throw new BadRequestException('Logo file is required');
    }
    if (!ALLOWED_MIME.has(file.mimetype)) {
      throw new UnsupportedMediaTypeException(
        `Unsupported logo type: ${file.mimetype}`,
      );
    }
    if (file.size > MAX_BYTES) {
      throw new BadRequestException(
        `Logo exceeds max size of ${MAX_BYTES} bytes`,
      );
    }

    const ext = extname(file.originalname).toLowerCase() || '.png';
    const path = `${randomUUID()}${ext}`;

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

  async deleteLogo(path: string): Promise<void> {
    const { error } = await this.supabase.admin.storage
      .from(BUCKET)
      .remove([path]);
    if (error) throw new Error(error.message);
  }
}
