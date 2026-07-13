import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user-role.enum';
import { CreateBrandDto } from './dto/create-brand.dto';
import { Brand } from './entities/brand.entity';
import { BrandsService } from './services/brands.service';

interface UploadedFileLike {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;
}

@ApiTags('brands')
@ApiBearerAuth('access-token')
@Controller('brands')
export class BrandsController {
  constructor(private readonly brands: BrandsService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @UseInterceptors(FileInterceptor('logo'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: CreateBrandDto })
  @ApiOperation({ summary: 'Create a brand with a logo (admin only)' })
  create(
    @Body() dto: CreateBrandDto,
    @UploadedFile() logo: UploadedFileLike,
  ): Promise<Brand> {
    return this.brands.create(dto, logo);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.EDITOR, UserRole.VIEWER)
  @ApiOperation({ summary: 'List all brands' })
  findAll(): Promise<Brand[]> {
    return this.brands.findAll();
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.EDITOR, UserRole.VIEWER)
  @ApiOperation({ summary: 'Get a brand by id' })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Brand> {
    return this.brands.findOne(id);
  }
}
