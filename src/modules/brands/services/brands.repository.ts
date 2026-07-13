import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository } from 'typeorm';
import { Brand } from '../entities/brand.entity';

@Injectable()
export class BrandsRepository {
  constructor(
    @InjectRepository(Brand)
    private readonly repo: Repository<Brand>,
  ) {}

  findById(id: string): Promise<Brand | null> {
    return this.repo.findOne({ where: { id } });
  }

  findByName(name: string): Promise<Brand | null> {
    return this.repo.findOne({ where: { name } });
  }

  findAll(): Promise<Brand[]> {
    return this.repo.find({ order: { createdAt: 'DESC' } });
  }

  create(data: DeepPartial<Brand>): Promise<Brand> {
    return this.repo.save(this.repo.create(data));
  }

  update(brand: Brand, patch: DeepPartial<Brand>): Promise<Brand> {
    return this.repo.save(this.repo.merge(brand, patch));
  }

  async delete(id: string): Promise<boolean> {
    const res = await this.repo.delete({ id });
    return (res.affected ?? 0) > 0;
  }
}
