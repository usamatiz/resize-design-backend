import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateProjectDto } from '../dto/create-project.dto';
import { UpdateProjectDto } from '../dto/update-project.dto';
import { Project } from '../entities/project.entity';
import { DesignsRepository } from './designs.repository';
import { DesignsStorageService } from './designs-storage.service';
import { ProjectsRepository } from './projects.repository';

@Injectable()
export class ProjectsService {
  constructor(
    private readonly projects: ProjectsRepository,
    private readonly designs: DesignsRepository,
    private readonly designsStorage: DesignsStorageService,
  ) {}

  create(brandId: string, dto: CreateProjectDto): Promise<Project> {
    return this.projects.create({
      brandId,
      name: dto.name,
      sourceJson: dto.sourceJson,
      sourceImageUrl: dto.sourceImageUrl ?? null,
    });
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

    await this.projects.delete(id);
  }
}
