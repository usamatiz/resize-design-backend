import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThanOrEqual, Repository } from 'typeorm';
import { Brand } from '../../brands/entities/brand.entity';
import { Design } from '../../projects/entities/design.entity';
import { Project } from '../../projects/entities/project.entity';
import { User } from '../../users/entities/user.entity';

export type ActivityType = 'user' | 'brand' | 'project' | 'design';

export interface ActivityRow {
  type: ActivityType;
  id: string;
  name: string;
  logoUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class DashboardRepository {
  constructor(
    @InjectRepository(Brand)
    private readonly brands: Repository<Brand>,
    @InjectRepository(Project)
    private readonly projects: Repository<Project>,
    @InjectRepository(Design)
    private readonly designs: Repository<Design>,
    @InjectRepository(User)
    private readonly users: Repository<User>,
  ) {}

  countBrands(): Promise<number> {
    return this.brands.count();
  }

  countUsers(): Promise<number> {
    return this.users.count();
  }

  countDesigns(): Promise<number> {
    return this.designs.count();
  }

  countProjects(): Promise<number> {
    return this.projects.count();
  }

  countBrandsSince(since: Date): Promise<number> {
    return this.brands.countBy({ createdAt: MoreThanOrEqual(since) });
  }

  countUsersSince(since: Date): Promise<number> {
    return this.users.countBy({ createdAt: MoreThanOrEqual(since) });
  }

  countProjectsSince(since: Date): Promise<number> {
    return this.projects.countBy({ createdAt: MoreThanOrEqual(since) });
  }

  countDesignsSince(since: Date): Promise<number> {
    return this.designs.countBy({ createdAt: MoreThanOrEqual(since) });
  }

  recentBrands(limit: number): Promise<Brand[]> {
    return this.brands.find({
      order: { updatedAt: 'DESC' },
      take: limit,
    });
  }

  async recentActivity(limit: number): Promise<ActivityRow[]> {
    const [users, brands, projects, designs] = await Promise.all([
      this.users.find({
        select: { id: true, fullName: true, createdAt: true, updatedAt: true },
        order: { updatedAt: 'DESC' },
        take: limit,
      }),
      this.brands.find({
        select: {
          id: true,
          name: true,
          logoUrl: true,
          createdAt: true,
          updatedAt: true,
        },
        order: { updatedAt: 'DESC' },
        take: limit,
      }),
      this.projects.find({
        select: { id: true, name: true, createdAt: true, updatedAt: true },
        order: { updatedAt: 'DESC' },
        take: limit,
      }),
      this.designs
        .createQueryBuilder('d')
        .leftJoin('d.project', 'p')
        .select([
          'd.id AS id',
          'p.name AS "projectName"',
          'd.width AS width',
          'd.height AS height',
          'd.created_at AS "createdAt"',
          'd.updated_at AS "updatedAt"',
        ])
        .orderBy('d.updated_at', 'DESC')
        .limit(limit)
        .getRawMany<{
          id: string;
          projectName: string | null;
          width: number;
          height: number;
          createdAt: Date;
          updatedAt: Date;
        }>(),
    ]);

    const rows: ActivityRow[] = [
      ...users.map<ActivityRow>((u) => ({
        type: 'user',
        id: u.id,
        name: u.fullName,
        logoUrl: null,
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
      })),
      ...brands.map<ActivityRow>((b) => ({
        type: 'brand',
        id: b.id,
        name: b.name,
        logoUrl: b.logoUrl,
        createdAt: b.createdAt,
        updatedAt: b.updatedAt,
      })),
      ...projects.map<ActivityRow>((p) => ({
        type: 'project',
        id: p.id,
        name: p.name,
        logoUrl: null,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      })),
      ...designs.map<ActivityRow>((d) => ({
        type: 'design',
        id: d.id,
        name: `${d.projectName ?? 'Design'} — ${d.width}×${d.height}`,
        logoUrl: null,
        createdAt: new Date(d.createdAt),
        updatedAt: new Date(d.updatedAt),
      })),
    ];

    return rows
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      .slice(0, limit);
  }
}
