import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository } from 'typeorm';
import { Design } from '../entities/design.entity';

@Injectable()
export class DesignsRepository {
  constructor(
    @InjectRepository(Design)
    private readonly repo: Repository<Design>,
  ) {}

  findById(id: string): Promise<Design | null> {
    return this.repo.findOne({ where: { id } });
  }

  findByProject(projectId: string): Promise<Design[]> {
    return this.repo.find({
      where: { projectId },
      order: { createdAt: 'DESC' },
    });
  }

  findSourceByProject(projectId: string): Promise<Design | null> {
    return this.repo.findOne({ where: { projectId, isSource: true } });
  }

  findSourcesByProjectIds(projectIds: string[]): Promise<Design[]> {
    if (projectIds.length === 0) return Promise.resolve([]);
    return this.repo
      .createQueryBuilder('d')
      .where('d.projectId IN (:...ids)', { ids: projectIds })
      .andWhere('d.isSource = true')
      .getMany();
  }

  findOneByProjectAndSize(
    projectId: string,
    width: number,
    height: number,
  ): Promise<Design | null> {
    return this.repo.findOne({ where: { projectId, width, height } });
  }

  create(data: DeepPartial<Design>): Promise<Design> {
    return this.repo.save(this.repo.create(data));
  }

  async update(id: string, data: DeepPartial<Design>): Promise<Design | null> {
    await this.repo.update({ id }, data as never);
    return this.findById(id);
  }

  async delete(id: string): Promise<boolean> {
    const res = await this.repo.delete({ id });
    return (res.affected ?? 0) > 0;
  }
}
