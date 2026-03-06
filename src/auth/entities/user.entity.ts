import { Entity, PrimaryGeneratedColumn, Column, OneToMany, ManyToOne, JoinColumn } from 'typeorm';
import { Base1C } from '../../bases/entities/base1c.entity';

export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
}

export enum UserStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  BLOCKED = 'blocked',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.USER })
  role: UserRole;

  @Column({ type: 'enum', enum: UserStatus, default: UserStatus.PENDING })
  status: UserStatus;

  @Column({ nullable: true, type: 'timestamp' })
  confirmedAt: Date | null;

  @Column({ nullable: true })
  confirmedBy: number | null;

  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'confirmedBy' })
  confirmedByUser: User;

  @OneToMany(() => Base1C, (base) => base.owner)
  bases: Base1C[];
}
