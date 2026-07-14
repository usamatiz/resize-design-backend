import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DesignsController } from './designs.controller';
import { Design } from './entities/design.entity';
import { Project } from './entities/project.entity';
import { ProjectsController } from './projects.controller';
import { DesignsClaudeService } from './services/designs-claude.service';
import { DesignsRenderService } from './services/designs-render.service';
import { DesignsRepository } from './services/designs.repository';
import { DesignsService } from './services/designs.service';
import { DesignsStorageService } from './services/designs-storage.service';
import { ProjectsRepository } from './services/projects.repository';
import { ProjectsService } from './services/projects.service';
import { ProjectsStorageService } from './services/projects-storage.service';

@Module({
  imports: [TypeOrmModule.forFeature([Project, Design])],
  controllers: [ProjectsController, DesignsController],
  providers: [
    ProjectsService,
    ProjectsRepository,
    ProjectsStorageService,
    DesignsService,
    DesignsRepository,
    DesignsStorageService,
    DesignsClaudeService,
    DesignsRenderService,
  ],
  exports: [ProjectsService, DesignsService],
})
export class ProjectsModule {}
