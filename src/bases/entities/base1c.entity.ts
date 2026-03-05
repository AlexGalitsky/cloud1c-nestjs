import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../auth/entities/user.entity';

export enum BaseStatus {
  READY = 'ready',
  PROCESSING = 'processing',
  ERROR = 'error',
}

@Entity('base1c')
export class Base1C {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ name: 'server_path' })
  serverPath: string;

  @Column({ name: 'admin_user' })
  adminUser: string;

  @Column({ name: 'admin_pass', select: false })
  adminPass: string;

  @Column({
    type: 'enum',
    enum: BaseStatus,
    default: BaseStatus.PROCESSING,
  })
  status: BaseStatus;

  @Column({ name: 'last_log', type: 'text', nullable: true })
  lastLog: string;

  @ManyToOne(() => User, (user) => user.bases, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'owner_id' })
  owner: User;

  @Column({ name: 'owner_id' })
  ownerId: number;
}
