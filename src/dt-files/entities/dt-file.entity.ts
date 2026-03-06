import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { Base1C } from '../../bases/entities/base1c.entity';

@Entity('dt_files')
export class DtFile {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  filename: string;

  @Column({ name: 'original_name' })
  originalName: string;

  @Column({ name: 'file_path' })
  filePath: string;

  @Column({ type: 'bigint' })
  fileSize: number;

  @Column({ name: 'base_id' })
  baseId: number;

  @ManyToOne(() => Base1C, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'base_id' })
  base: Base1C;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'last_applied_at', type: 'timestamp', nullable: true })
  lastAppliedAt: Date | null;

  @Column({ default: false })
  applied: boolean;

  @Column({ nullable: true })
  comment?: string;
}
