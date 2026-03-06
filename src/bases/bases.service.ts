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
import { CreateBaseDto, UpdateBaseDto, UploadDtDto } from './dto/base.dto';
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

  async create(createBaseDto: CreateBaseDto, ownerId: number): Promise<Base1C> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Проверяем на дублирование названия базы
      const existingBase = await this.baseRepository.findOne({ where: { name: createBaseDto.name } });
      if (existingBase) {
        throw new ForbiddenException('База с таким названием уже существует');
      }

      // Формируем serverPath автоматически из адреса кластера и названия
      const serverPath = this.commandExecutor.buildServerPath(createBaseDto.name);

      const base = this.baseRepository.create({
        name: createBaseDto.name,
        serverPath,
        ownerId,
        status: BaseStatus.PROCESSING,
        lastLog: 'Создание базы в кластере...',
        description: createBaseDto.description || undefined,
        isEmpty: true,
      });

      await queryRunner.manager.save(base);

      // Создаем базу в кластере 1С
      const createResult = await this.commandExecutor.executeCreateBaseCommand(base);

      if (!createResult.success) {
        await queryRunner.manager.update(Base1C, base.id, {
          status: BaseStatus.ERROR,
          lastLog: `Ошибка создания базы в кластере: ${createResult.error}`,
        });
        await queryRunner.commitTransaction();
        const savedBase = await this.baseRepository.findOne({ where: { id: base.id } });
        if (!savedBase) {
          throw new NotFoundException('Base not found after creation');
        }
        return savedBase;
      }

      // База успешно создана в кластере
      await queryRunner.manager.update(Base1C, base.id, {
        status: BaseStatus.READY,
        lastLog: `База создана в кластере (ID: ${createResult.infobaseId}). Загрузите файл .dt для восстановления.`,
      });

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

  async uploadDt(
    id: number,
    ownerId: number,
    dtFile: Express.Multer.File,
    uploadDto: UploadDtDto,
  ): Promise<DtFile> {
    const base = await this.baseRepository.findOne({ where: { id } });

    if (!base) {
      throw new NotFoundException('Base not found');
    }

    if (base.ownerId !== ownerId) {
      throw new ForbiddenException('You do not own this base');
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `base_${base.id}_${timestamp}_${dtFile.originalname}`;
    const dtPath = path.join(this.uploadDir, filename);
    fs.writeFileSync(dtPath, dtFile.buffer);

    // Сохраняем информацию о файле
    const dtFileRecord = await this.dtFilesService.create(
      base.id,
      filename,
      dtFile.originalname,
      dtPath,
      dtFile.size,
    );

    // Сохраняем adminUser/adminPass если предоставлены
    if (uploadDto.adminUser) {
      base.adminUser = uploadDto.adminUser;
      base.adminPass = uploadDto.adminPass;
      await this.baseRepository.save(base);
    }

    return dtFileRecord;
  }

  async update(id: number, updateBaseDto: UpdateBaseDto, ownerId: number): Promise<Base1C> {
    const base = await this.baseRepository.findOne({ where: { id } });

    if (!base) {
      throw new NotFoundException('Base not found');
    }

    if (base.ownerId !== ownerId) {
      throw new ForbiddenException('You do not own this base');
    }

    // Обновляем только description
    if (updateBaseDto.description !== undefined) {
      base.description = updateBaseDto.description;
    }

    await this.baseRepository.save(base);

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

  async publish(id: number, ownerId: number): Promise<{ message: string }> {
    const base = await this.findOne(id, ownerId);

    if (!base) {
      throw new NotFoundException('Base not found');
    }

    // Запускаем публикацию
    await this.commandExecutor.publishBase(base, async (log, success) => {
      await this.baseRepository.update(id, {
        lastLog: log,
      });
    });

    return { message: 'Publish started' };
  }
}
