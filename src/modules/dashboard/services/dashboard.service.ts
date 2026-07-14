import { Injectable } from '@nestjs/common';
import { DashboardStatsDto } from '../dto/dashboard-stats.dto';
import { DashboardRepository } from './dashboard.repository';

const RECENT_ACTIVITY_LIMIT = 10;
const RECENT_BRANDS_LIMIT = 5;

@Injectable()
export class DashboardService {
  constructor(private readonly repo: DashboardRepository) {}

  async getStats(): Promise<DashboardStatsDto> {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [
      totalBrands,
      totalTeamMembers,
      totalProjects,
      totalDesigns,
      usersAdded,
      brandsAdded,
      projectsAdded,
      designsAdded,
      recentActivity,
      recentBrands,
    ] = await Promise.all([
      this.repo.countBrands(),
      this.repo.countUsers(),
      this.repo.countProjects(),
      this.repo.countDesigns(),
      this.repo.countUsersSince(startOfToday),
      this.repo.countBrandsSince(startOfToday),
      this.repo.countProjectsSince(startOfToday),
      this.repo.countDesignsSince(startOfToday),
      this.repo.recentActivity(RECENT_ACTIVITY_LIMIT),
      this.repo.recentBrands(RECENT_BRANDS_LIMIT),
    ]);

    return {
      totals: {
        totalBrands,
        totalTeamMembers,
        totalProjects,
        totalDesigns,
      },
      todayActivity: {
        usersAdded,
        brandsAdded,
        projectsAdded,
        designsAdded,
      },
      recentActivity,
      recentBrands,
    };
  }
}
