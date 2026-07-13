import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CreateBrandDto } from '../dto/create-brand.dto';
import { UpdateBrandDto } from '../dto/update-brand.dto';
import { Brand } from '../entities/brand.entity';
import { BrandsStorageService } from './brands-storage.service';
import { BrandsRepository } from './brands.repository';

interface LogoFile {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;
}

@Injectable()
export class BrandsService {
  private readonly logger = new Logger(BrandsService.name);

  constructor(
    private readonly brandsRepo: BrandsRepository,
    private readonly brandsStorage: BrandsStorageService,
  ) {}

  async create(dto: CreateBrandDto, logo: LogoFile): Promise<Brand> {
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

  async update(
    id: string,
    dto: UpdateBrandDto,
    logo?: LogoFile,
  ): Promise<Brand> {
    const brand = await this.findOne(id);

    if (dto.name && dto.name !== brand.name) {
      const clash = await this.brandsRepo.findByName(dto.name);
      if (clash && clash.id !== brand.id) {
        throw new ConflictException(`Brand "${dto.name}" already exists`);
      }
    }

    const previousLogoUrl = brand.logoUrl;
    let uploadedPath: string | null = null;
    const patch: Partial<Brand> = { ...dto };

    if (logo?.buffer) {
      const uploaded = await this.brandsStorage.uploadLogo(logo);
      uploadedPath = uploaded.path;
      patch.logoUrl = uploaded.publicUrl;
    }

    try {
      const saved = await this.brandsRepo.update(brand, patch);

      if (uploadedPath) {
        const oldPath =
          this.brandsStorage.extractPathFromPublicUrl(previousLogoUrl);
        if (oldPath) {
          await this.brandsStorage.deleteLogo(oldPath).catch((err: Error) => {
            this.logger.warn(
              `Failed to delete replaced logo ${oldPath}: ${err.message}`,
            );
          });
        }
      }

      return saved;
    } catch (err) {
      if (uploadedPath) {
        await this.brandsStorage
          .deleteLogo(uploadedPath)
          .catch(() => undefined);
      }
      throw err;
    }
  }
}
