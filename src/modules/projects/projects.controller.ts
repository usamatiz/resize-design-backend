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
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user-role.enum';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { Project } from './entities/project.entity';
import { ProjectsService } from './services/projects.service';

@ApiTags('projects')
@ApiBearerAuth('access-token')
@Controller()
export class ProjectsController {
  constructor(private readonly projects: ProjectsService) {}

  @Post('brands/:brandId/projects')
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  @ApiOperation({ summary: 'Create a project under a brand' })
  create(
    @Param('brandId', ParseUUIDPipe) brandId: string,
    @Body() dto: CreateProjectDto,
  ): Promise<Project> {
    return this.projects.create(brandId, dto);
  }

  @Get('brands/:brandId/projects')
  @Roles(UserRole.ADMIN, UserRole.EDITOR, UserRole.VIEWER)
  @ApiOperation({ summary: 'List projects in a brand' })
  findByBrand(
    @Param('brandId', ParseUUIDPipe) brandId: string,
  ): Promise<Project[]> {
    return this.projects.findByBrand(brandId);
  }

  @Get('projects/:id')
  @Roles(UserRole.ADMIN, UserRole.EDITOR, UserRole.VIEWER)
  @ApiOperation({ summary: 'Get a project with its designs' })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Project> {
    return this.projects.findOne(id);
  }

  @Patch('projects/:id')
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  @ApiOperation({ summary: 'Update a project' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProjectDto,
  ): Promise<Project> {
    return this.projects.update(id, dto);
  }

  @Delete('projects/:id')
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete a project and cascade its designs' })
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.projects.remove(id);
  }
}
