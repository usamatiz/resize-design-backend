import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { DesignSizeDto } from '../dto/create-designs-batch.dto';
import { GeneratePresetSizeDto } from '../dto/generate-presets.dto';
import { UpdateDesignDto } from '../dto/update-design.dto';
import { Design } from '../entities/design.entity';
import { DesignsClaudeService } from './designs-claude.service';
import { DesignsRenderService } from './designs-render.service';
import { DesignsRepository } from './designs.repository';
import { DesignsStorageService } from './designs-storage.service';
import { ProjectsRepository } from './projects.repository';
import { ProjectsStorageService } from './projects-storage.service';

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

export type PresetSkipReason = 'matches-source' | 'already-exists';

export type PresetStreamEvent =
  | { type: 'skipped'; key: string; reason: PresetSkipReason; design?: Design }
  | { type: 'start'; key: string; width: number; height: number }
  | { type: 'delta'; key: string; text: string }
  | { type: 'rendering'; key: string }
  | { type: 'saving'; key: string }
  | { type: 'done'; key: string; design: Design }
  | { type: 'error'; key: string; message: string }
  | { type: 'complete' };

const DEFAULT_PRESET_PROMPT =
  'Reflow the layout to fit the new canvas dimensions while preserving the visual hierarchy.';

@Injectable()
export class DesignsService {
  private readonly logger = new Logger(DesignsService.name);

  constructor(
    private readonly projects: ProjectsRepository,
    private readonly designs: DesignsRepository,
    private readonly storage: DesignsStorageService,
    private readonly claude: DesignsClaudeService,
    private readonly render: DesignsRenderService,
    private readonly projectsStorage: ProjectsStorageService,
  ) {}

  async batchResize(
    projectId: string,
    prompt: string,
    sizes: DesignSizeDto[],
  ): Promise<BatchResizeResult> {
    const project = await this.projects.findById(projectId);
    if (!project) throw new NotFoundException(`Project ${projectId} not found`);
    const source = await this.designs.findSourceByProject(projectId);
    if (!source) {
      throw new NotFoundException(
        `Project ${projectId} has no source design`,
      );
    }

    const results = await Promise.allSettled(
      sizes.map((size) =>
        this.claude
          .resize(source.resizedJson, prompt, size.width, size.height)
          .then((res) =>
            this.designs.create({
              projectId,
              width: size.width,
              height: size.height,
              resizedJson: res.resizedJson,
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

  async *streamPresetGeneration(
    projectId: string,
    promptInput: string | undefined,
    sizes: GeneratePresetSizeDto[],
  ): AsyncGenerator<PresetStreamEvent, void, unknown> {
    const project = await this.projects.findById(projectId);
    if (!project) throw new NotFoundException(`Project ${projectId} not found`);
    const source = await this.designs.findSourceByProject(projectId);
    if (!source) {
      throw new BadRequestException(
        `Project ${projectId} has no source design`,
      );
    }

    const prompt = promptInput?.trim() || DEFAULT_PRESET_PROMPT;

    type Runnable = { kind: 'runnable'; size: GeneratePresetSizeDto };
    type Skipped = {
      kind: 'skipped';
      size: GeneratePresetSizeDto;
      reason: PresetSkipReason;
      design?: Design;
    };

    const classified: (Runnable | Skipped)[] = await Promise.all(
      sizes.map(async (size): Promise<Runnable | Skipped> => {
        if (source.width === size.width && source.height === size.height) {
          return { kind: 'skipped', size, reason: 'matches-source' };
        }
        const existing = await this.designs.findOneByProjectAndSize(
          projectId,
          size.width,
          size.height,
        );
        if (existing) {
          return {
            kind: 'skipped',
            size,
            reason: 'already-exists',
            design: existing,
          };
        }
        return { kind: 'runnable', size };
      }),
    );

    for (const item of classified) {
      if (item.kind === 'skipped') {
        yield {
          type: 'skipped',
          key: item.size.key,
          reason: item.reason,
          design: item.design,
        };
      }
    }

    const runnable = classified.filter(
      (c): c is Runnable => c.kind === 'runnable',
    );
    if (runnable.length === 0) {
      yield { type: 'complete' };
      return;
    }

    const queue: PresetStreamEvent[] = [];
    const waiters: Array<() => void> = [];
    let activeCount = runnable.length;

    const push = (event: PresetStreamEvent) => {
      queue.push(event);
      const waiter = waiters.shift();
      if (waiter) waiter();
    };
    const wakeup = () => {
      const waiter = waiters.shift();
      if (waiter) waiter();
    };

    for (const { size } of runnable) {
      void this.runOnePreset(projectId, source.resizedJson, prompt, size, push)
        .finally(() => {
          activeCount -= 1;
          wakeup();
        });
    }

    while (activeCount > 0 || queue.length > 0) {
      if (queue.length === 0) {
        await new Promise<void>((resolve) => waiters.push(resolve));
        continue;
      }
      yield queue.shift()!;
    }

    yield { type: 'complete' };
  }

  private async runOnePreset(
    projectId: string,
    sourceJson: unknown,
    prompt: string,
    size: GeneratePresetSizeDto,
    push: (event: PresetStreamEvent) => void,
  ): Promise<void> {
    push({ type: 'start', key: size.key, width: size.width, height: size.height });
    try {
      let resizedJson: Record<string, unknown> | null = null;

      for await (const event of this.claude.resizeStream(
        sourceJson,
        prompt,
        size.width,
        size.height,
      )) {
        if (event.type === 'delta') {
          push({ type: 'delta', key: size.key, text: event.text });
        } else {
          resizedJson = event.resizedJson;
        }
      }

      if (!resizedJson) {
        throw new Error('Claude stream ended without producing JSON');
      }

      push({ type: 'rendering', key: size.key });

      const design = await this.designs.create({
        projectId,
        width: size.width,
        height: size.height,
        resizedJson,
      });

      const rendered = await this.render.renderDesignAsPng(resizedJson);
      push({ type: 'saving', key: size.key });
      const uploaded = await this.storage.uploadImage(design.id, {
        buffer: rendered.buffer,
        mimetype: rendered.mimetype,
        originalname: `${design.id}.png`,
        size: rendered.bytes,
      });
      const withImage = await this.designs.update(design.id, {
        imageUrl: uploaded.publicUrl,
        imageStoragePath: uploaded.path,
      });

      push({ type: 'done', key: size.key, design: withImage ?? design });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `Preset ${size.key} (${size.width}x${size.height}) failed: ${message}`,
      );
      push({ type: 'error', key: size.key, message });
    }
  }

  async *regenerateStream(
    designId: string,
    promptInput: string,
  ): AsyncGenerator<PresetStreamEvent, void, unknown> {
    const design = await this.designs.findById(designId);
    if (!design) throw new NotFoundException(`Design ${designId} not found`);
    if (design.isSource) {
      throw new BadRequestException(
        `Design ${designId} is the project's source and cannot be regenerated`,
      );
    }
    const source = await this.designs.findSourceByProject(design.projectId);
    if (!source) {
      throw new BadRequestException(
        `Project ${design.projectId} has no source design`,
      );
    }
    const prompt = promptInput.trim();
    if (!prompt) {
      throw new BadRequestException('Prompt is required');
    }

    const key = `regenerate:${design.id}`;
    yield {
      type: 'start',
      key,
      width: design.width,
      height: design.height,
    };

    try {
      let resizedJson: Record<string, unknown> | null = null;

      for await (const event of this.claude.resizeStream(
        source.resizedJson,
        prompt,
        design.width,
        design.height,
      )) {
        if (event.type === 'delta') {
          yield { type: 'delta', key, text: event.text };
        } else {
          resizedJson = event.resizedJson;
        }
      }

      if (!resizedJson) {
        throw new Error('Claude stream ended without producing JSON');
      }

      yield { type: 'rendering', key };
      const rendered = await this.render.renderDesignAsPng(resizedJson);

      yield { type: 'saving', key };
      const uploaded = await this.storage.uploadImage(design.id, {
        buffer: rendered.buffer,
        mimetype: rendered.mimetype,
        originalname: `${design.id}.png`,
        size: rendered.bytes,
      });

      if (design.imageStoragePath) {
        await this.storage
          .deleteImage(design.imageStoragePath)
          .catch(() => undefined);
      }

      const updated = await this.designs.update(design.id, {
        resizedJson,
        imageUrl: uploaded.publicUrl,
        imageStoragePath: uploaded.path,
      });
      if (!updated) {
        throw new NotFoundException(`Design ${design.id} not found`);
      }

      yield { type: 'done', key, design: updated };
      yield { type: 'complete' };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `Regenerate ${designId} (${design.width}x${design.height}) failed: ${message}`,
      );
      yield { type: 'error', key, message };
    }
  }

  findByProject(projectId: string): Promise<Design[]> {
    return this.designs.findByProject(projectId);
  }

  async findOne(id: string): Promise<Design> {
    const design = await this.designs.findById(id);
    if (!design) throw new NotFoundException(`Design ${id} not found`);
    return design;
  }

  async updateDesign(id: string, dto: UpdateDesignDto): Promise<Design> {
    const existing = await this.designs.findById(id);
    if (!existing) throw new NotFoundException(`Design ${id} not found`);

    const rendered = await this.render.renderDesignAsPng(dto.resizedJson);
    const uploaded = await this.storage.uploadImage(id, {
      buffer: rendered.buffer,
      mimetype: rendered.mimetype,
      originalname: `${id}.png`,
      size: rendered.bytes,
    });

    if (existing.imageStoragePath) {
      await this.storage
        .deleteImage(existing.imageStoragePath)
        .catch(() => undefined);
    }

    const patch: Partial<Design> = {
      resizedJson: dto.resizedJson,
      imageUrl: uploaded.publicUrl,
      imageStoragePath: uploaded.path,
    };
    if (dto.width !== undefined) patch.width = dto.width;
    if (dto.height !== undefined) patch.height = dto.height;

    const updated = await this.designs.update(id, patch);
    if (!updated) throw new NotFoundException(`Design ${id} not found`);

    if (existing.isSource) {
      const project = await this.projects.findById(existing.projectId);
      if (project?.sourceImagePath) {
        await this.projectsStorage
          .deletePreview(project.sourceImagePath)
          .catch(() => undefined);
      }
      await this.projects.update(existing.projectId, {
        sourceImageUrl: uploaded.publicUrl,
        sourceImagePath: null,
      });
    }

    return updated;
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

      if (design.isSource) {
        const project = await this.projects.findById(design.projectId);
        if (project?.sourceImagePath) {
          await this.projectsStorage
            .deletePreview(project.sourceImagePath)
            .catch(() => undefined);
        }
        await this.projects.update(design.projectId, {
          sourceImageUrl: uploaded.publicUrl,
          sourceImagePath: null,
        });
      }

      return updated;
    } catch (err) {
      await this.storage.deleteImage(uploaded.path).catch(() => undefined);
      throw err;
    }
  }

  async remove(id: string): Promise<void> {
    const design = await this.designs.findById(id);
    if (!design) throw new NotFoundException(`Design ${id} not found`);
    if (design.isSource) {
      throw new BadRequestException(
        `Design ${id} is the project's source design and cannot be deleted directly. Delete the project instead.`,
      );
    }
    if (design.imageStoragePath) {
      await this.storage
        .deleteImage(design.imageStoragePath)
        .catch(() => undefined);
    }
    await this.designs.delete(id);
  }
}
