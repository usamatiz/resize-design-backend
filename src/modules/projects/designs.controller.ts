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
  Res,
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
import type { Response } from 'express';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user-role.enum';
import { CreateDesignsBatchDto } from './dto/create-designs-batch.dto';
import { GeneratePresetsDto } from './dto/generate-presets.dto';
import { RegenerateDesignDto } from './dto/regenerate-design.dto';
import { UpdateDesignDto } from './dto/update-design.dto';
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

  @Post('projects/:projectId/designs/generate-presets')
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  @ApiOperation({
    summary:
      'Stream Claude-generated designs (SSE) for a set of preset dimensions',
  })
  async generatePresets(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: GeneratePresetsDto,
    @Res() res: Response,
  ): Promise<void> {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    let clientClosed = false;
    const onClose = () => {
      clientClosed = true;
    };
    res.on('close', onClose);

    try {
      for await (const event of this.designs.streamPresetGeneration(
        projectId,
        dto.prompt,
        dto.sizes,
      )) {
        if (clientClosed) break;
        res.write(`data: ${JSON.stringify(event)}\n\n`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (!clientClosed) {
        res.write(`data: ${JSON.stringify({ type: 'error', message })}\n\n`);
      }
    } finally {
      res.off('close', onClose);
      if (!clientClosed) res.end();
    }
  }

  @Post('designs/:id/regenerate')
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  @ApiOperation({
    summary:
      'Stream Claude regeneration of an existing design (SSE) with a new prompt; updates the design in place',
  })
  async regenerate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RegenerateDesignDto,
    @Res() res: Response,
  ): Promise<void> {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    let clientClosed = false;
    const onClose = () => {
      clientClosed = true;
    };
    res.on('close', onClose);

    try {
      for await (const event of this.designs.regenerateStream(id, dto.prompt)) {
        if (clientClosed) break;
        res.write(`data: ${JSON.stringify(event)}\n\n`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (!clientClosed) {
        res.write(`data: ${JSON.stringify({ type: 'error', message })}\n\n`);
      }
    } finally {
      res.off('close', onClose);
      if (!clientClosed) res.end();
    }
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

  @Patch('designs/:id')
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  @ApiOperation({
    summary:
      'Update a design’s JSON in place; backend re-renders the PNG via Polotno cloud and replaces the stored image.',
  })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDesignDto,
  ): Promise<Design> {
    return this.designs.updateDesign(id, dto);
  }

  @Delete('designs/:id')
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete a design and its stored image' })
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.designs.remove(id);
  }
}
