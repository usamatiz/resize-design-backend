import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Brand } from '../../brands/entities/brand.entity';
import { Design } from './design.entity';

@Entity({ name: 'projects' })
export class Project {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'brand_id', type: 'uuid' })
  brandId: string;

  @ManyToOne(() => Brand, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'brand_id' })
  brand?: Brand;

  @Column({ type: 'text' })
  name: string;

  @Column({ name: 'source_json', type: 'jsonb' })
  sourceJson: Record<string, unknown>;

  @Column({ name: 'source_image_url', type: 'text', nullable: true })
  sourceImageUrl: string | null;

  @Column({ name: 'source_image_path', type: 'text', nullable: true })
  sourceImagePath: string | null;

  @Column({ type: 'int' })
  width: number;

  @Column({ type: 'int' })
  height: number;

  @OneToMany(() => Design, (design) => design.project)
  designs?: Design[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
