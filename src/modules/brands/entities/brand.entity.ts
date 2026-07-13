import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'brands' })
export class Brand {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ type: 'text' })
  name: string;

  @Column({ name: 'logo_url', type: 'text' })
  logoUrl: string;

  @Column({ type: 'text' })
  location: string;

  @Column({ type: 'text' })
  category: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
