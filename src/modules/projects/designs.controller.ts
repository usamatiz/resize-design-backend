import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
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
import { CreateDesignsBatchDto } from './dto/create-designs-batch.dto';
import { UploadDesignImageDto } from './dto/upload-design-image.dto';
import { Design } from './entities/design.entity';
import { DesignsService } from './services/designs.service';
import type {
  BatchResizeResult,
  DesignImageFile,
} from './services/designs.service';

@ApiTags('designs')
@ApiBearerAuth('access-token')
@Controller()
export class DesignsController {
  constructor(private readonly designs: DesignsService) {}

  @Post('projects/:projectId/designs/batch')
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  @ApiOperation({
    summary:
      'Batch-resize the project source JSON via Claude into N designs (one per size)',
  })
  batch(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: CreateDesignsBatchDto,
  ): Promise<BatchResizeResult> {
    return this.designs.batchResize(projectId, dto.prompt, dto.sizes);
  }

  @Get('projects/:projectId/designs')
  @Roles(UserRole.ADMIN, UserRole.EDITOR, UserRole.VIEWER)
  @ApiOperation({ summary: 'List designs in a project' })
  findByProject(
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ): Promise<Design[]> {
    return this.designs.findByProject(projectId);
  }

  @Get('designs/:id')
  @Roles(UserRole.ADMIN, UserRole.EDITOR, UserRole.VIEWER)
  @ApiOperation({ summary: 'Get a design' })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Design> {
    return this.designs.findOne(id);
  }

  @Post('designs/:id/image')
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  @UseInterceptors(FileInterceptor('image'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: UploadDesignImageDto })
  @ApiOperation({
    summary:
      'Attach the Polotno-rendered PNG/JPEG to a design (called after client renders the resized JSON)',
  })
  attachImage(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() image: DesignImageFile,
  ): Promise<Design> {
    return this.designs.attachImage(id, image);
  }

  @Delete('designs/:id')
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete a design and its stored image' })
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.designs.remove(id);
  }
}
