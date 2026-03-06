import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole, UserStatus } from '../auth/entities/user.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class SeedsService implements OnModuleInit {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async onModuleInit() {
    await this.createSuperAdmin();
  }

  async createSuperAdmin() {
    const adminEmail = 'alex.galitsky.kd@gmail.com';
    const adminPassword = 'hflj!e7SAd6ghd552asd';

    const existingAdmin = await this.userRepository.findOne({
      where: { email: adminEmail },
    });

    if (existingAdmin) {
      return;
    }

    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    const admin = this.userRepository.create({
      email: adminEmail,
      password: hashedPassword,
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      confirmedAt: new Date(),
    });

    await this.userRepository.save(admin);
    console.log(`✓ Суперадмин создан: ${adminEmail}`);
  }
}
