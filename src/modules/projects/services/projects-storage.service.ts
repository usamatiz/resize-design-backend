import {
  BadRequestException,
  Injectable,
  Logger,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { extname } from 'path';
import { SupabaseService } from '../../../supabase/supabase.service';

export interface UploadedProjectPreview {
  path: string;
  publicUrl: string;
}

const BUCKET = 'project-previews';
const ALLOWED_MIME = new Set(['image/png', 'image/jpeg']);
const MAX_BYTES = 15 * 1024 * 1024;

@Injectable()
export class ProjectsStorageService {
  private readonly logger = new Logger(ProjectsStorageService.name);

  constructor(private readonly supabase: SupabaseService) {}

  async uploadPreview(
    projectId: string,
    file: {
      buffer: Buffer;
      mimetype: string;
      originalname: string;
      size: number;
    },
  ): Promise<UploadedProjectPreview> {
    if (!file?.buffer) {
      throw new BadRequestException('Preview image is required');
    }
    if (!ALLOWED_MIME.has(file.mimetype)) {
      throw new UnsupportedMediaTypeException(
        `Unsupported image type: ${file.mimetype}`,
      );
    }
    if (file.size > MAX_BYTES) {
      throw new BadRequestException(
        `Preview image exceeds max size of ${MAX_BYTES} bytes`,
      );
    }

    const ext = extname(file.originalname).toLowerCase() || '.png';
    const path = `${projectId}/${randomUUID()}${ext}`;

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

  async deletePreview(path: string): Promise<void> {
    const { error } = await this.supabase.admin.storage
      .from(BUCKET)
      .remove([path]);
    if (error) throw new Error(error.message);
  }
}
