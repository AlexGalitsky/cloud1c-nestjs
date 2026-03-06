import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DtFile } from './entities/dt-file.entity';
import { CommandExecutorService } from '../command-executor/command-executor.service';
import { Base1C, BaseStatus } from '../bases/entities/base1c.entity';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class DtFilesService {
  private readonly uploadDir = path.join(process.cwd(), 'dt-files');

  constructor(
    @InjectRepository(DtFile)
    private readonly dtFileRepository: Repository<DtFile>,
    @InjectRepository(Base1C)
    private readonly baseRepository: Repository<Base1C>,
    private readonly commandExecutor: CommandExecutorService,
  ) {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async findAll(baseId: number): Promise<DtFile[]> {
    return this.dtFileRepository.find({
      where: { baseId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: number, baseId: number): Promise<DtFile> {
    const dtFile = await this.dtFileRepository.findOne({
      where: { id, baseId },
    });

    if (!dtFile) {
      throw new NotFoundException('File not found');
    }

    return dtFile;
  }

  async create(
    baseId: number,
    filename: string,
    originalName: string,
    filePath: string,
    fileSize: number,
  ): Promise<DtFile> {
    const dtFile = this.dtFileRepository.create({
      baseId,
      filename,
      originalName,
      filePath,
      fileSize,
      applied: false,
    });

    return this.dtFileRepository.save(dtFile);
  }

  async remove(id: number, baseId: number): Promise<void> {
    const dtFile = await this.findOne(id, baseId);

    // Удаляем файл с диска
    if (fs.existsSync(dtFile.filePath)) {
      fs.unlinkSync(dtFile.filePath);
    }

    await this.dtFileRepository.remove(dtFile);
  }

  async apply(id: number, baseId: number): Promise<void> {
    const dtFile = await this.findOne(id, baseId);
    const base = await this.baseRepository.findOne({ where: { id: baseId } });

    if (!base) {
      throw new NotFoundException('Base not found');
    }

    // Обновляем статус базы на processing
    await this.baseRepository.update(baseId, {
      status: BaseStatus.PROCESSING,
      lastLog: 'Применение файла .dt...',
    });

    // Выполняем команду 1С
    // isFirstRestore=false, так как это повторная загрузка в существующую базу
    this.commandExecutor.executeRestoreCommand(
      base,
      dtFile.filePath,
      async (log: string, status: BaseStatus) => {
        await this.baseRepository.update(baseId, { lastLog: log, status });

        // Обновляем информацию о последнем применении
        if (status === BaseStatus.READY) {
          await this.dtFileRepository.update(id, {
            applied: true,
            lastAppliedAt: new Date(),
          });

          // Сбрасываем флаг applied у других файлов
          await this.dtFileRepository
            .createQueryBuilder()
            .update()
            .set({ applied: false })
            .where('baseId = :baseId', { baseId })
            .andWhere('id != :id', { id })
            .execute();
        }
      },
      false, // isFirstRestore=false для повторной загрузки
    );
  }

  async markAsApplied(id: number): Promise<void> {
    await this.dtFileRepository.update(id, {
      applied: true,
      lastAppliedAt: new Date(),
    });
  }
}
