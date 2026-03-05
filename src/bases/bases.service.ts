import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Base1C, BaseStatus } from './entities/base1c.entity';
import { CreateBaseDto, UpdateBaseDto } from './dto/base.dto';
import { CommandExecutorService } from '../command-executor/command-executor.service';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class BasesService {
  private readonly uploadDir = path.join(process.cwd(), 'uploads');

  constructor(
    @InjectRepository(Base1C)
    private readonly baseRepository: Repository<Base1C>,
    private readonly commandExecutor: CommandExecutorService,
    private readonly dataSource: DataSource,
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
        const dtPath = path.join(this.uploadDir, `base_${base.id}_${dtFile.originalname}`);
        fs.writeFileSync(dtPath, dtFile.buffer);

        this.commandExecutor.executeRestoreCommand(
          base,
          dtPath,
          async (log: string, status: BaseStatus) => {
            await this.dataSource.manager.update(Base1C, base.id, { lastLog: log, status });
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
      const dtPath = path.join(this.uploadDir, `base_${base.id}_${dtFile.originalname}`);
      fs.writeFileSync(dtPath, dtFile.buffer);

      this.commandExecutor.executeRestoreCommand(
        base,
        dtPath,
        async (log: string, status: BaseStatus) => {
          await this.dataSource.manager.update(Base1C, base.id, { lastLog: log, status });
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
