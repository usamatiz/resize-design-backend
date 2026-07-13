import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateBrandDto } from '../dto/create-brand.dto';
import { Brand } from '../entities/brand.entity';
import { BrandsStorageService } from './brands-storage.service';
import { BrandsRepository } from './brands.repository';

@Injectable()
export class BrandsService {
  constructor(
    private readonly brandsRepo: BrandsRepository,
    private readonly brandsStorage: BrandsStorageService,
  ) {}

  async create(
    dto: CreateBrandDto,
    logo: {
      buffer: Buffer;
      mimetype: string;
      originalname: string;
      size: number;
    },
  ): Promise<Brand> {
    const existing = await this.brandsRepo.findByName(dto.name);
    if (existing) {
      throw new ConflictException(`Brand "${dto.name}" already exists`);
    }

    const uploaded = await this.brandsStorage.uploadLogo(logo);

    try {
      return await this.brandsRepo.create({
        name: dto.name,
        location: dto.location,
        category: dto.category,
        logoUrl: uploaded.publicUrl,
      });
    } catch (err) {
      await this.brandsStorage
        .deleteLogo(uploaded.path)
        .catch(() => undefined);
      throw err;
    }
  }

  findAll(): Promise<Brand[]> {
    return this.brandsRepo.findAll();
  }

  async findOne(id: string): Promise<Brand> {
    const brand = await this.brandsRepo.findById(id);
    if (!brand) throw new NotFoundException(`Brand ${id} not found`);
    return brand;
  }
}
