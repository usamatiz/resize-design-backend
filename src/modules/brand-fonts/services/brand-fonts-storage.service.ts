import {
  BadRequestException,
  Injectable,
  Logger,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { extname } from 'path';
import { SupabaseService } from '../../../supabase/supabase.service';

export interface UploadedFont {
  path: string;
  publicUrl: string;
}

const BUCKET = 'brand-fonts';
const ALLOWED_EXT = new Set(['.ttf', '.otf', '.woff', '.woff2']);
const MAX_BYTES = 5 * 1024 * 1024;

const EXT_TO_MIME: Record<string, string> = {
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

@Injectable()
export class BrandFontsStorageService {
  private readonly logger = new Logger(BrandFontsStorageService.name);

  constructor(private readonly supabase: SupabaseService) {}

  async uploadFont(
    brandId: string,
    file: {
      buffer: Buffer;
      mimetype: string;
      originalname: string;
      size: number;
    },
  ): Promise<UploadedFont> {
    if (!file?.buffer) {
      throw new BadRequestException('Font file is required');
    }
    const ext = extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXT.has(ext)) {
      throw new UnsupportedMediaTypeException(
        `Unsupported font extension: ${ext || '(none)'}`,
      );
    }
    if (file.size > MAX_BYTES) {
      throw new BadRequestException(
        `Font exceeds max size of ${MAX_BYTES} bytes`,
      );
    }

    const path = `${brandId}/${randomUUID()}${ext}`;
    const contentType = EXT_TO_MIME[ext] ?? file.mimetype ?? 'font/ttf';

    const { error } = await this.supabase.admin.storage
      .from(BUCKET)
      .upload(path, file.buffer, {
        contentType,
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

  async deleteFont(path: string): Promise<void> {
    const { error } = await this.supabase.admin.storage
      .from(BUCKET)
      .remove([path]);
    if (error) throw new Error(error.message);
  }
}
