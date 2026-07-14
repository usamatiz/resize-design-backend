import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateProjectDto } from '../dto/create-project.dto';
import { UpdateProjectDto } from '../dto/update-project.dto';
import { Design } from '../entities/design.entity';
import { Project } from '../entities/project.entity';
import { DesignsRepository } from './designs.repository';
import { DesignsStorageService } from './designs-storage.service';
import { ProjectsRepository } from './projects.repository';
import { ProjectsStorageService } from './projects-storage.service';

interface PreviewFile {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;
}

export type ProjectSummary = Project & {
  designCount: number;
  sourceDesign: Design | null;
};
export type ProjectDetail = Project & {
  designCount: number;
  sourceDesign: Design | null;
};

@Injectable()
export class ProjectsService {
  constructor(
    private readonly projects: ProjectsRepository,
    private readonly designs: DesignsRepository,
    private readonly designsStorage: DesignsStorageService,
    private readonly projectsStorage: ProjectsStorageService,
  ) {}

  async create(
    brandId: string,
    dto: CreateProjectDto,
    preview?: PreviewFile,
  ): Promise<ProjectDetail> {
    const project = await this.projects.create({
      brandId,
      name: dto.name,
      sourceImageUrl: null,
      sourceImagePath: null,
    });

    let uploadedPath: string | null = null;

    try {
      let sourceImageUrl: string | null = null;
      let sourceImagePath: string | null = null;

      if (preview?.buffer) {
        const uploaded = await this.projectsStorage.uploadPreview(
          project.id,
          preview,
        );
        uploadedPath = uploaded.path;
        sourceImageUrl = uploaded.publicUrl;
        sourceImagePath = uploaded.path;

        await this.projects.update(project.id, {
          sourceImageUrl,
          sourceImagePath,
        });
      }

      const sourceDesign = await this.designs.create({
        projectId: project.id,
        width: dto.width,
        height: dto.height,
        resizedJson: dto.sourceJson,
        imageUrl: sourceImageUrl,
        imageStoragePath: null,
        isSource: true,
      });

      const refreshed = (await this.projects.findById(project.id)) ?? project;
      return { ...refreshed, designCount: 1, sourceDesign };
    } catch (err) {
      if (uploadedPath) {
        await this.projectsStorage
          .deletePreview(uploadedPath)
          .catch(() => undefined);
      }
      await this.projects.delete(project.id).catch(() => undefined);
      throw err;
    }
  }

  async findByBrand(brandId: string): Promise<ProjectSummary[]> {
    const rows = await this.projects.findByBrand(brandId);
    if (rows.length === 0) return [];
    const ids = rows.map((p) => p.id);
    const [counts, sources] = await Promise.all([
      this.projects.countDesignsByProjectIds(ids),
      this.designs.findSourcesByProjectIds(ids),
    ]);
    const sourceByProject = new Map(sources.map((d) => [d.projectId, d]));
    return rows.map((p) => ({
      ...p,
      designCount: counts.get(p.id) ?? 0,
      sourceDesign: sourceByProject.get(p.id) ?? null,
    }));
  }

  async findOne(id: string): Promise<ProjectDetail> {
    const project = await this.projects.findByIdWithDesigns(id);
    if (!project) throw new NotFoundException(`Project ${id} not found`);
    const sourceDesign =
      project.designs?.find((d) => d.isSource) ??
      (await this.designs.findSourceByProject(id));
    return {
      ...project,
      designCount: project.designs?.length ?? 0,
      sourceDesign: sourceDesign ?? null,
    };
  }

  async update(
    id: string,
    dto: UpdateProjectDto,
    preview?: PreviewFile,
  ): Promise<ProjectDetail> {
    const existing = await this.projects.findById(id);
    if (!existing) throw new NotFoundException(`Project ${id} not found`);

    let patch: Partial<Project> = { ...dto };

    if (preview?.buffer) {
      const uploaded = await this.projectsStorage.uploadPreview(id, preview);
      patch = {
        ...patch,
        sourceImageUrl: uploaded.publicUrl,
        sourceImagePath: uploaded.path,
      };
      if (existing.sourceImagePath) {
        await this.projectsStorage
          .deletePreview(existing.sourceImagePath)
          .catch(() => undefined);
      }

      const sourceDesign = await this.designs.findSourceByProject(id);
      if (sourceDesign) {
        await this.designs.update(sourceDesign.id, {
          imageUrl: uploaded.publicUrl,
        });
      }
    }

    const updated = await this.projects.update(id, patch);
    if (!updated) throw new NotFoundException(`Project ${id} not found`);

    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const existing = await this.projects.findById(id);
    if (!existing) throw new NotFoundException(`Project ${id} not found`);

    const designs = await this.designs.findByProject(id);
    for (const design of designs) {
      if (design.imageStoragePath) {
        await this.designsStorage
          .deleteImage(design.imageStoragePath)
          .catch(() => undefined);
      }
    }

    if (existing.sourceImagePath) {
      await this.projectsStorage
        .deletePreview(existing.sourceImagePath)
        .catch(() => undefined);
    }

    await this.projects.delete(id);
  }
}
