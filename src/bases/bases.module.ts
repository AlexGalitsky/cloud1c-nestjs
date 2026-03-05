import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BasesController } from './bases.controller';
import { BasesService } from './bases.service';
import { Base1C } from './entities/base1c.entity';
import { CommandExecutorModule } from '../command-executor/command-executor.module';

@Module({
  imports: [TypeOrmModule.forFeature([Base1C]), CommandExecutorModule],
  controllers: [BasesController],
  providers: [BasesService],
})
export class BasesModule {}
