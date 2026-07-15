import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
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
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../users/entities/user-role.enum';
import { BrandAsset } from './entities/brand-asset.entity';
import { BrandAssetsService } from './services/brand-assets.service';

interface UploadedFileLike {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;
}

@ApiTags('brand-assets')
@ApiBearerAuth('access-token')
@Controller('brands/:brandId/assets')
export class BrandAssetsController {
  constructor(private readonly assets: BrandAssetsService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.EDITOR, UserRole.VIEWER)
  @ApiOperation({ summary: 'List assets for a brand' })
  list(
    @Param('brandId', ParseUUIDPipe) brandId: string,
  ): Promise<BrandAsset[]> {
    return this.assets.list(brandId);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiOperation({ summary: 'Upload an image asset for a brand' })
  upload(
    @Param('brandId', ParseUUIDPipe) brandId: string,
    @UploadedFile() file: UploadedFileLike,
    @CurrentUser() user: User,
  ): Promise<BrandAsset> {
    return this.assets.upload(brandId, file, user?.id ?? null);
  }

  @Delete(':assetId')
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a brand asset' })
  async delete(
    @Param('brandId', ParseUUIDPipe) brandId: string,
    @Param('assetId', ParseUUIDPipe) assetId: string,
  ): Promise<void> {
    await this.assets.delete(brandId, assetId);
  }
}
