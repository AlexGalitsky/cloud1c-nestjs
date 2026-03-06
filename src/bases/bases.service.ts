import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  InternalServerErrorException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Base1C, BaseStatus } from './entities/base1c.entity';
import { CreateBaseDto, UpdateBaseDto } from './dto/base.dto';
import { CommandExecutorService } from '../command-executor/command-executor.service';
import { DtFilesService } from '../dt-files/dt-files.service';
import { DtFile } from '../dt-files/entities/dt-file.entity';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class BasesService {
  private readonly uploadDir = path.join(process.cwd(), 'dt-files');

  constructor(
    @InjectRepository(Base1C)
    private readonly baseRepository: Repository<Base1C>,
    private readonly commandExecutor: CommandExecutorService,
    private readonly dataSource: DataSource,
    @Inject(forwardRef(() => DtFilesService))
    private readonly dtFilesService: DtFilesService,
  ) {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async create(createBaseDto: CreateBaseDto, ownerId: number, dtFile?: Express.Multer.File): Promise<Base1C> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const base = this.baseRepository.create({
        ...createBaseDto,
        ownerId,
        status: BaseStatus.PROCESSING,
        lastLog: 'Инициализация...',
      });

      await queryRunner.manager.save(base);

      if (dtFile) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `base_${base.id}_${timestamp}_${dtFile.originalname}`;
        const dtPath = path.join(this.uploadDir, filename);
        fs.writeFileSync(dtPath, dtFile.buffer);

        // Сохраняем информацию о файле
        await this.dtFilesService.create(
          base.id,
          filename,
          dtFile.originalname,
          dtPath,
          dtFile.size,
        );

        this.commandExecutor.executeRestoreCommand(
          base,
          dtPath,
          async (log: string, status: BaseStatus) => {
            await this.dataSource.manager.update(Base1C, base.id, { lastLog: log, status });
            
            // Помечаем файл как применённый
            if (status === BaseStatus.READY) {
              const dtFileRecord = await this.dataSource.manager.findOne(DtFile, {
                where: { filePath: dtPath },
              });
              if (dtFileRecord) {
                await this.dtFilesService.markAsApplied(dtFileRecord.id);
              }
            }
          },
        );
      } else {
        await queryRunner.manager.update(Base1C, base.id, { status: BaseStatus.READY, lastLog: 'База создана без файла .dt' });
      }

      await queryRunner.commitTransaction();
      const savedBase = await this.baseRepository.findOne({ where: { id: base.id } });
      if (!savedBase) {
        throw new NotFoundException('Base not found after creation');
      }
      return savedBase;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw new InternalServerErrorException(error.message);
    } finally {
      await queryRunner.release();
    }
  }

  async update(id: number, updateBaseDto: UpdateBaseDto, ownerId: number, dtFile?: Express.Multer.File): Promise<Base1C> {
    const base = await this.baseRepository.findOne({ where: { id } });

    if (!base) {
      throw new NotFoundException('Base not found');
    }

    if (base.ownerId !== ownerId) {
      throw new ForbiddenException('You do not own this base');
    }

    Object.assign(base, updateBaseDto);

    if (dtFile) {
      base.status = BaseStatus.PROCESSING;
      base.lastLog = 'Обновление базы...';
    }

    await this.baseRepository.save(base);

    if (dtFile) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `base_${base.id}_${timestamp}_${dtFile.originalname}`;
      const dtPath = path.join(this.uploadDir, filename);
      fs.writeFileSync(dtPath, dtFile.buffer);

      // Сохраняем информацию о файле
      await this.dtFilesService.create(
        base.id,
        filename,
        dtFile.originalname,
        dtPath,
        dtFile.size,
      );

      this.commandExecutor.executeRestoreCommand(
        base,
        dtPath,
        async (log: string, status: BaseStatus) => {
          await this.dataSource.manager.update(Base1C, base.id, { lastLog: log, status });
          
          // Помечаем файл как применённый
          if (status === BaseStatus.READY) {
            const dtFileRecord = await this.dataSource.manager.findOne(DtFile, {
              where: { filePath: dtPath },
            });
            if (dtFileRecord) {
              await this.dtFilesService.markAsApplied(dtFileRecord.id);
            }
          }
        },
      );
    }

    const updatedBase = await this.baseRepository.findOne({ where: { id } });
    if (!updatedBase) {
      throw new NotFoundException('Base not found after update');
    }
    return updatedBase;
  }

  async findAll(ownerId: number): Promise<Base1C[]> {
    return this.baseRepository.find({ where: { ownerId } });
  }

  async findOne(id: number, ownerId: number): Promise<Base1C> {
    const base = await this.baseRepository.findOne({ where: { id } });

    if (!base) {
      throw new NotFoundException('Base not found');
    }

    if (base.ownerId !== ownerId) {
      throw new ForbiddenException('You do not own this base');
    }

    return base;
  }

  async getStatus(id: number, ownerId: number) {
    const base = await this.findOne(id, ownerId);
    return {
      status: base.status,
      lastLog: base.lastLog,
    };
  }

  async remove(id: number, ownerId: number): Promise<void> {
    const base = await this.findOne(id, ownerId);
    await this.baseRepository.remove(base);
  }
}
