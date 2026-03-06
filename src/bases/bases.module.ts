import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BasesController } from './bases.controller';
import { BasesService } from './bases.service';
import { Base1C } from './entities/base1c.entity';
import { CommandExecutorModule } from '../command-executor/command-executor.module';
import { DtFilesModule } from '../dt-files/dt-files.module';
import { BaseCleanupService } from './base-cleanup.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Base1C]),
    CommandExecutorModule,
    forwardRef(() => DtFilesModule),
  ],
  controllers: [BasesController],
  providers: [BasesService, BaseCleanupService],
  exports: [BasesService],
})
export class BasesModule {}
