import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository } from 'typeorm';
import { UserRole } from '../entities/user-role.enum';
import { User } from '../entities/user.entity';

@Injectable()
export class UsersRepository {
  constructor(
    @InjectRepository(User)
    private readonly repo: Repository<User>,
  ) {}

  findById(id: string): Promise<User | null> {
    return this.repo.findOne({ where: { id } });
  }

  findByEmail(email: string): Promise<User | null> {
    return this.repo.findOne({ where: { email } });
  }

  findBySupabaseAuthId(authId: string): Promise<User | null> {
    return this.repo.findOne({ where: { supabaseAuthId: authId } });
  }

  findAll(): Promise<User[]> {
    return this.repo.find({ order: { createdAt: 'DESC' } });
  }

  countByRole(role: UserRole): Promise<number> {
    return this.repo.countBy({ role });
  }

  create(data: DeepPartial<User>): Promise<User> {
    return this.repo.save(this.repo.create(data));
  }

  async update(id: string, data: DeepPartial<User>): Promise<User | null> {
    await this.repo.update({ id }, data as Partial<User>);
    return this.findById(id);
  }

  async delete(id: string): Promise<boolean> {
    const res = await this.repo.delete({ id });
    return (res.affected ?? 0) > 0;
  }
}
