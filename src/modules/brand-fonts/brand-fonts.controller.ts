import {
  Body,
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
import { BrandFont } from './entities/brand-font.entity';
import { BrandFontsService } from './services/brand-fonts.service';

interface UploadedFileLike {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;
}

@ApiTags('brand-fonts')
@ApiBearerAuth('access-token')
@Controller('brands/:brandId/fonts')
export class BrandFontsController {
  constructor(private readonly fonts: BrandFontsService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.EDITOR, UserRole.VIEWER)
  @ApiOperation({ summary: 'List fonts for a brand' })
  list(@Param('brandId', ParseUUIDPipe) brandId: string): Promise<BrandFont[]> {
    return this.fonts.list(brandId);
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
        fontFamily: {
          type: 'string',
          example: 'Acme Sans',
          description:
            'Optional. Falls back to a name derived from the filename.',
        },
      },
    },
  })
  @ApiOperation({ summary: 'Upload a font for a brand' })
  upload(
    @Param('brandId', ParseUUIDPipe) brandId: string,
    @UploadedFile() file: UploadedFileLike,
    @Body('fontFamily') fontFamily: string | undefined,
    @CurrentUser() user: User,
  ): Promise<BrandFont> {
    return this.fonts.upload(brandId, file, fontFamily, user?.id ?? null);
  }

  @Delete(':fontId')
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a brand font' })
  async delete(
    @Param('brandId', ParseUUIDPipe) brandId: string,
    @Param('fontId', ParseUUIDPipe) fontId: string,
  ): Promise<void> {
    await this.fonts.delete(brandId, fontId);
  }
}
