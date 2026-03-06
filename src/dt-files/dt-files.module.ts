import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DtFilesController } from './dt-files.controller';
import { DtFilesService } from './dt-files.service';
import { DtFile } from './entities/dt-file.entity';
import { BasesModule } from '../bases/bases.module';
import { CommandExecutorModule } from '../command-executor/command-executor.module';
import { Base1C } from 'src/bases/entities/base1c.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([DtFile, Base1C]),
    CommandExecutorModule,
    forwardRef(() => BasesModule),
  ],
  controllers: [DtFilesController],
  providers: [DtFilesService],
  exports: [DtFilesService],
})
export class DtFilesModule {}
