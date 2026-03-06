import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Base1C } from './entities/base1c.entity';
import { CommandExecutorService } from '../command-executor/command-executor.service';
import { exec } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class BaseCleanupService {
  private readonly logger = new Logger(BaseCleanupService.name);
  private readonly racPath = process.env.RAC_PATH || 'C:\\Program Files\\1cv8\\8.3.18.1208\\bin\\rac.exe';
  private readonly clusterId = process.env.CLUSTER_ID || '';
  private readonly logsDir = path.join(process.cwd(), 'logs');

  constructor(
    @InjectRepository(Base1C)
    private readonly baseRepository: Repository<Base1C>,
    private readonly commandExecutor: CommandExecutorService,
  ) {
    if (!fs.existsSync(this.logsDir)) {
      fs.mkdirSync(this.logsDir, { recursive: true });
    }
  }

  /**
   * Планировщик: раз в минуту проверяет базы помеченные на удаление
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async handleCleanup(): Promise<void> {
    const basesToDelete = await this.baseRepository.find({
      where: { isDeleted: true },
    });

    if (basesToDelete.length === 0) {
      return;
    }

    this.logger.log(`Проверка ${basesToDelete.length} баз помеченных на удаление...`);

    for (const base of basesToDelete) {
      await this.checkAndDeleteBase(base);
    }
  }

  /**
   * Проверяет наличие базы в кластере и удаляет из БД если её нет
   */
  private async checkAndDeleteBase(base: Base1C): Promise<void> {
    if (!this.clusterId || !base.clusterGuid) {
      this.logger.warn(`Пропуск базы ${base.id}: нет clusterId или clusterGuid`);
      return;
    }

    const exists = await this.checkBaseInCluster(base.clusterGuid);
    
    if (exists) {
      this.logger.log(`База ${base.name} (${base.clusterGuid}) ещё существует в кластере`);
      return;
    }

    // База удалена из кластера - удаляем из БД
    this.logger.log(`База ${base.name} удалена из кластера, удаляем из БД...`);
    
    // Удаляем .dt файлы
    const dtFilesDir = path.join(process.cwd(), 'dt-files');
    if (fs.existsSync(dtFilesDir)) {
      const files = fs.readdirSync(dtFilesDir);
      for (const file of files) {
        if (file.includes(`base_${base.id}_`)) {
          fs.unlinkSync(path.join(dtFilesDir, file));
          this.logger.log(`Удален файл: ${file}`);
        }
      }
    }

    // Удаляем папку публикации
    const wwwRoot = process.env.WWW_ROOT || 'C:\\inetpub\\wwwroot';
    const wwwDir = path.join(wwwRoot, base.name);
    if (fs.existsSync(wwwDir)) {
      fs.rmSync(wwwDir, { recursive: true, force: true });
      this.logger.log(`Удалена папка публикации: ${wwwDir}`);
    }

    // Удаляем запись из БД
    await this.baseRepository.remove(base);
    this.logger.log(`База ${base.name} полностью удалена`);
  }

  /**
   * Проверяет наличие базы в кластере 1С
   * @returns true если база существует, false если нет
   */
  private async checkBaseInCluster(clusterGuid: string): Promise<boolean> {
    return new Promise((resolve) => {
      const logPath = path.join(this.logsDir, `check_cluster_${clusterGuid}.log`);
      const escapedRacPath = this.racPath.replace(/"/g, '\\"');
      const escapedClusterId = this.clusterId;
      const escapedLogPath = logPath.replace(/"/g, '\\"');

      // rac.exe infobase summary info --infobase=<guid> --cluster=<id>
      const command = `chcp 65001 >nul && "${escapedRacPath}" infobase summary info --infobase=${clusterGuid} --cluster=${escapedClusterId} > "${escapedLogPath}" 2>&1`;

      const process = exec(command);
      let output = '';

      process.stdout?.on('data', (data) => {
        output += data.toString();
      });

      process.on('close', () => {
        // Читаем лог файл
        let logContent = '';
        if (fs.existsSync(logPath)) {
          logContent = fs.readFileSync(logPath, 'utf-8');
        }

        // Считаем количество строк
        const lines = logContent.split('\n').filter(line => line.trim() !== '');
        
        // 3 строки - база есть, 1 строка - базы нет
        const exists = lines.length >= 3;
        
        this.logger.debug(`Проверка базы ${clusterGuid}: строк=${lines.length}, существует=${exists}`);
        resolve(exists);
      });

      process.on('error', (error) => {
        this.logger.error(`Ошибка проверки базы ${clusterGuid}: ${error.message}`);
        resolve(false);
      });
    });
  }
}
