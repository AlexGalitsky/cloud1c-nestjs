import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../auth/entities/user.entity';
import { SeedsService } from './seeds.service';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  providers: [SeedsService],
  exports: [SeedsService],
})
export class SeedsModule {}
