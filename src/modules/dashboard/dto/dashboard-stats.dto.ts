import { ApiProperty } from '@nestjs/swagger';
import { Brand } from '../../brands/entities/brand.entity';

export class DashboardTotalsDto {
  @ApiProperty({ example: 12 })
  totalBrands: number;

  @ApiProperty({ example: 8 })
  totalTeamMembers: number;

  @ApiProperty({
    example: 5,
    description: 'Projects that have at least one design',
  })
  activeProjects: number;

  @ApiProperty({ example: 42 })
  totalDesigns: number;
}

export class TodayActivityDto {
  @ApiProperty({ example: 1 })
  usersAdded: number;

  @ApiProperty({ example: 2 })
  brandsAdded: number;

  @ApiProperty({ example: 3 })
  projectsAdded: number;

  @ApiProperty({ example: 7 })
  designsAdded: number;
}

export class RecentActivityItemDto {
  @ApiProperty({ enum: ['user', 'brand', 'project', 'design'] })
  type: 'user' | 'brand' | 'project' | 'design';

  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty({
    nullable: true,
    description: 'Populated for brand activity items; null for other types.',
  })
  logoUrl: string | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class DashboardStatsDto {
  @ApiProperty({ type: DashboardTotalsDto })
  totals: DashboardTotalsDto;

  @ApiProperty({ type: TodayActivityDto })
  todayActivity: TodayActivityDto;

  @ApiProperty({ type: [RecentActivityItemDto] })
  recentActivity: RecentActivityItemDto[];

  @ApiProperty({ type: [Brand] })
  recentBrands: Brand[];
}
