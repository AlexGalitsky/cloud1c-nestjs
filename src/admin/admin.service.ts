import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole, UserStatus } from '../auth/entities/user.entity';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async findAllUsers(): Promise<User[]> {
    return this.userRepository.find({
      select: ['id', 'email', 'role', 'status', 'confirmedAt', 'confirmedBy'],
      relations: ['confirmedByUser'],
    });
  }

  async findUserById(id: number): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
      select: ['id', 'email', 'role', 'status', 'confirmedAt', 'confirmedBy'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async updateUser(id: number, updateUserDto: UpdateUserDto, adminId: number): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (updateUserDto.role) {
      user.role = updateUserDto.role as UserRole;
    }

    if (updateUserDto.status) {
      user.status = updateUserDto.status as UserStatus;

      if (user.status === UserStatus.ACTIVE && user.confirmedAt === null) {
        user.confirmedAt = new Date();
        user.confirmedBy = adminId;
      }
    }

    return this.userRepository.save(user);
  }

  async confirmUser(userId: number, adminId: number): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.status = UserStatus.ACTIVE;
    user.confirmedAt = new Date();
    user.confirmedBy = adminId;

    return this.userRepository.save(user);
  }

  async blockUser(userId: number): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.status = UserStatus.BLOCKED;

    return this.userRepository.save(user);
  }

  async deleteUser(id: number): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.userRepository.delete(id);
  }

  async createUser(email: string, password: string, role: 'admin' | 'user' = 'user'): Promise<User> {
    const existingUser = await this.userRepository.findOne({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = this.userRepository.create({
      email,
      password: hashedPassword,
      role: role as UserRole,
      status: UserStatus.ACTIVE,
      confirmedAt: new Date(),
    });

    return this.userRepository.save(user);
  }
}
