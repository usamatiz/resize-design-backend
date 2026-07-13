import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository } from 'typeorm';
import { Project } from '../entities/project.entity';

@Injectable()
export class ProjectsRepository {
  constructor(
    @InjectRepository(Project)
    private readonly repo: Repository<Project>,
  ) {}

  findById(id: string): Promise<Project | null> {
    return this.repo.findOne({ where: { id } });
  }

  findByIdWithDesigns(id: string): Promise<Project | null> {
    return this.repo.findOne({
      where: { id },
      relations: { designs: true },
      order: { designs: { createdAt: 'DESC' } },
    });
  }

  findByBrand(brandId: string): Promise<Project[]> {
    return this.repo.find({
      where: { brandId },
      order: { createdAt: 'DESC' },
    });
  }

  create(data: DeepPartial<Project>): Promise<Project> {
    return this.repo.save(this.repo.create(data));
  }

  async update(id: string, data: DeepPartial<Project>): Promise<Project | null> {
    await this.repo.update({ id }, data as never);
    return this.findById(id);
  }

  async delete(id: string): Promise<boolean> {
    const res = await this.repo.delete({ id });
    return (res.affected ?? 0) > 0;
  }
}
