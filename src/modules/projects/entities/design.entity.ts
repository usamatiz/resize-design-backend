import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Project } from './project.entity';

@Entity({ name: 'designs' })
export class Design {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'project_id', type: 'uuid' })
  projectId: string;

  @ManyToOne(() => Project, (project) => project.designs, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'project_id' })
  project?: Project;

  @Column({ type: 'int' })
  width: number;

  @Column({ type: 'int' })
  height: number;

  @Column({ type: 'text' })
  prompt: string;

  @Column({ name: 'resized_json', type: 'jsonb' })
  resizedJson: Record<string, unknown>;

  @Column({ name: 'image_url', type: 'text', nullable: true })
  imageUrl: string | null;

  @Column({ name: 'image_storage_path', type: 'text', nullable: true })
  imageStoragePath: string | null;

  @Column({ name: 'claude_model', type: 'text', nullable: true })
  claudeModel: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
