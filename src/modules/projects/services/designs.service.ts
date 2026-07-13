import {
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { DesignSizeDto } from '../dto/create-designs-batch.dto';
import { Design } from '../entities/design.entity';
import { DesignsClaudeService } from './designs-claude.service';
import { DesignsRepository } from './designs.repository';
import { DesignsStorageService } from './designs-storage.service';
import { ProjectsRepository } from './projects.repository';

export interface BatchResizeResult {
  succeeded: Design[];
  failed: { width: number; height: number; error: string }[];
}

export interface DesignImageFile {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;
}

@Injectable()
export class DesignsService {
  private readonly logger = new Logger(DesignsService.name);

  constructor(
    private readonly projects: ProjectsRepository,
    private readonly designs: DesignsRepository,
    private readonly storage: DesignsStorageService,
    private readonly claude: DesignsClaudeService,
  ) {}

  async batchResize(
    projectId: string,
    prompt: string,
    sizes: DesignSizeDto[],
  ): Promise<BatchResizeResult> {
    const project = await this.projects.findById(projectId);
    if (!project) throw new NotFoundException(`Project ${projectId} not found`);

    const results = await Promise.allSettled(
      sizes.map((size) =>
        this.claude
          .resize(project.sourceJson, prompt, size.width, size.height)
          .then((res) =>
            this.designs.create({
              projectId,
              width: size.width,
              height: size.height,
              prompt,
              resizedJson: res.resizedJson,
              claudeModel: res.model,
            }),
          ),
      ),
    );

    const succeeded: Design[] = [];
    const failed: BatchResizeResult['failed'] = [];
    results.forEach((res, i) => {
      if (res.status === 'fulfilled') {
        succeeded.push(res.value);
      } else {
        const reason =
          res.reason instanceof Error ? res.reason.message : String(res.reason);
        this.logger.error(
          `Resize failed for ${sizes[i].width}x${sizes[i].height}: ${reason}`,
        );
        failed.push({ ...sizes[i], error: reason });
      }
    });

    return { succeeded, failed };
  }

  findByProject(projectId: string): Promise<Design[]> {
    return this.designs.findByProject(projectId);
  }

  async findOne(id: string): Promise<Design> {
    const design = await this.designs.findById(id);
    if (!design) throw new NotFoundException(`Design ${id} not found`);
    return design;
  }

  async attachImage(id: string, file: DesignImageFile): Promise<Design> {
    const design = await this.designs.findById(id);
    if (!design) throw new NotFoundException(`Design ${id} not found`);

    if (design.imageStoragePath) {
      await this.storage
        .deleteImage(design.imageStoragePath)
        .catch(() => undefined);
    }

    const uploaded = await this.storage.uploadImage(id, file);

    try {
      const updated = await this.designs.update(id, {
        imageUrl: uploaded.publicUrl,
        imageStoragePath: uploaded.path,
      });
      if (!updated) throw new NotFoundException(`Design ${id} not found`);
      return updated;
    } catch (err) {
      await this.storage.deleteImage(uploaded.path).catch(() => undefined);
      throw err;
    }
  }

  async remove(id: string): Promise<void> {
    const design = await this.designs.findById(id);
    if (!design) throw new NotFoundException(`Design ${id} not found`);
    if (design.imageStoragePath) {
      await this.storage
        .deleteImage(design.imageStoragePath)
        .catch(() => undefined);
    }
    await this.designs.delete(id);
  }
}
