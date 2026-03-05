import { Injectable, Logger } from '@nestjs/common';
import { exec } from 'child_process';
import { Base1C, BaseStatus } from '../bases/entities/base1c.entity';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class CommandExecutorService {
  private readonly logger = new Logger(CommandExecutorService.name);
  private readonly oneCPath = process.env.ONEC_PATH || 'C:\\Program Files\\1cv8\\8.3.25.1549\\bin\\1cv8.exe';
  private readonly logsDir = path.join(process.cwd(), 'logs');
  private readonly resolutionCode = process.env.ONEC_RESOLUTION_CODE || 'КодРазрешения';

  constructor() {
    if (!fs.existsSync(this.logsDir)) {
      fs.mkdirSync(this.logsDir, { recursive: true });
    }
  }

  executeRestoreCommand(
    base: Base1C,
    dtPath: string,
    callback: (log: string, status: BaseStatus) => Promise<void>,
  ): void {
    const logPath = path.join(this.logsDir, `base_${base.id}.log`);
    
    // Экранирование пути для команды
    const escapedOneCPath = this.oneCPath;
    const escapedServerPath = base.serverPath.replace(/"/g, '\\"');
    const escapedAdminUser = base.adminUser.replace(/"/g, '\\"');
    const escapedAdminPass = base.adminPass.replace(/"/g, '\\"');
    const escapedDtPath = dtPath.replace(/"/g, '\\"');
    const escapedLogPath = logPath.replace(/"/g, '\\"');
    const escapedResolutionCode = this.resolutionCode.replace(/"/g, '\\"');

    const command = `"${escapedOneCPath}" CONFIG /S"${escapedServerPath}" /N"${escapedAdminUser}" /P"${escapedAdminPass}" /RestoreIB "${escapedDtPath}" /Out "${escapedLogPath}" /UC "${escapedResolutionCode}"`;

    this.logger.log(`Выполнение команды: ${command}`);

    const process = exec(command);

    process.stdout?.on('data', (data) => {
      this.logger.log(`stdout: ${data}`);
    });

    process.stderr?.on('data', (data) => {
      this.logger.error(`stderr: ${data}`);
    });

    process.on('close', async (code) => {
      this.logger.log(`Процесс завершен с кодом: ${code}`);
      
      let logContent = '';
      if (fs.existsSync(logPath)) {
        logContent = fs.readFileSync(logPath, 'utf-8');
      }

      if (code === 0) {
        this.logger.log(`База ${base.id} успешно восстановлена`);
        await callback(logContent || 'База успешно восстановлена', BaseStatus.READY);
      } else {
        this.logger.error(`Ошибка при восстановлении базы ${base.id}, код: ${code}`);
        await callback(logContent || `Ошибка выполнения команды (код: ${code})`, BaseStatus.ERROR);
      }
    });

    process.on('error', async (error) => {
      this.logger.error(`Ошибка процесса: ${error.message}`);
      await callback(`Ошибка процесса: ${error.message}`, BaseStatus.ERROR);
    });
  }
}
