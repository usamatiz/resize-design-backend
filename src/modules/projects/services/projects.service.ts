import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateProjectDto } from '../dto/create-project.dto';
import { UpdateProjectDto } from '../dto/update-project.dto';
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
  ): Promise<Project> {
    const project = await this.projects.create({
      brandId,
      name: dto.name,
      sourceJson: dto.sourceJson,
      sourceImageUrl: null,
      sourceImagePath: null,
      width: dto.width,
      height: dto.height,
    });

    if (!preview?.buffer) {
      return project;
    }

    try {
      const uploaded = await this.projectsStorage.uploadPreview(
        project.id,
        preview,
      );
      const updated = await this.projects.update(project.id, {
        sourceImageUrl: uploaded.publicUrl,
        sourceImagePath: uploaded.path,
      });
      return updated ?? project;
    } catch (err) {
      await this.projects.delete(project.id).catch(() => undefined);
      throw err;
    }
  }

  findByBrand(brandId: string): Promise<Project[]> {
    return this.projects.findByBrand(brandId);
  }

  async findOne(id: string): Promise<Project> {
    const project = await this.projects.findByIdWithDesigns(id);
    if (!project) throw new NotFoundException(`Project ${id} not found`);
    return project;
  }

  async update(id: string, dto: UpdateProjectDto): Promise<Project> {
    const existing = await this.projects.findById(id);
    if (!existing) throw new NotFoundException(`Project ${id} not found`);
    const updated = await this.projects.update(id, dto);
    if (!updated) throw new NotFoundException(`Project ${id} not found`);
    return updated;
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
