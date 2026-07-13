import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user-role.enum';
import { DashboardStatsDto } from './dto/dashboard-stats.dto';
import { DashboardService } from './services/dashboard.service';

@ApiTags('dashboard')
@ApiBearerAuth('access-token')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get('stats')
  @Roles(UserRole.ADMIN, UserRole.EDITOR, UserRole.VIEWER)
  @ApiOperation({
    summary:
      'Totals (brands, team members, active projects, designs) plus today\'s activity and recent items',
  })
  getStats(): Promise<DashboardStatsDto> {
    return this.dashboard.getStats();
  }
}
