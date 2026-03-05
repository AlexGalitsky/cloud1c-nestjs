import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Base1C } from '../../bases/entities/base1c.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @OneToMany(() => Base1C, (base) => base.owner)
  bases: Base1C[];
}
