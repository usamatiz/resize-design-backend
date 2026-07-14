import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
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
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import {
  ProjectDetail,
  ProjectsService,
  ProjectSummary,
} from './services/projects.service';

interface UploadedFileLike {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;
}

@ApiTags('projects')
@ApiBearerAuth('access-token')
@Controller()
export class ProjectsController {
  constructor(private readonly projects: ProjectsService) {}

  @Post('brands/:brandId/projects')
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  @UseInterceptors(FileInterceptor('image'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['name', 'sourceJson', 'width', 'height', 'image'],
      properties: {
        name: { type: 'string', example: 'Summer campaign v1' },
        sourceJson: {
          type: 'string',
          description: 'Polotno store JSON, sent as a JSON string',
        },
        width: { type: 'integer', example: 1080 },
        height: { type: 'integer', example: 1080 },
        image: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiOperation({ summary: 'Create a project under a brand' })
  create(
    @Param('brandId', ParseUUIDPipe) brandId: string,
    @Body() dto: CreateProjectDto,
    @UploadedFile() image: UploadedFileLike | undefined,
  ): Promise<ProjectDetail> {
    return this.projects.create(brandId, dto, image);
  }

  @Get('brands/:brandId/projects')
  @Roles(UserRole.ADMIN, UserRole.EDITOR, UserRole.VIEWER)
  @ApiOperation({ summary: 'List projects in a brand' })
  findByBrand(
    @Param('brandId', ParseUUIDPipe) brandId: string,
  ): Promise<ProjectSummary[]> {
    return this.projects.findByBrand(brandId);
  }

  @Get('projects/:id')
  @Roles(UserRole.ADMIN, UserRole.EDITOR, UserRole.VIEWER)
  @ApiOperation({ summary: 'Get a project with its designs' })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<ProjectDetail> {
    return this.projects.findOne(id);
  }

  @Patch('projects/:id')
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  @UseInterceptors(FileInterceptor('image'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'Summer campaign v2' },
        image: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiOperation({
    summary:
      'Update a project (name and/or cover image). Canvas edits go to the source design endpoint.',
  })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProjectDto,
    @UploadedFile() image: UploadedFileLike | undefined,
  ): Promise<ProjectDetail> {
    return this.projects.update(id, dto, image);
  }

  @Delete('projects/:id')
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete a project and cascade its designs' })
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.projects.remove(id);
  }
}
