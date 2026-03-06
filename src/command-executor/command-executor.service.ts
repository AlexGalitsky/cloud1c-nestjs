import { Injectable, Logger } from '@nestjs/common';
import { exec } from 'child_process';
import { Base1C, BaseStatus } from '../bases/entities/base1c.entity';
import * as fs from 'fs';
import * as path from 'path';

export interface CreateBaseResult {
  success: boolean;
  infobaseId?: string;
  error?: string;
}

@Injectable()
export class CommandExecutorService {
  private readonly logger = new Logger(CommandExecutorService.name);
  private readonly oneCPath = process.env.ONEC_PATH || 'C:\\Program Files\\1cv8\\8.3.25.1549\\bin\\1cv8.exe';
  private readonly racPath = process.env.RAC_PATH || 'C:\\Program Files\\1cv8\\8.3.25.1549\\bin\\rac.exe';
  private readonly logsDir = path.join(process.cwd(), 'logs');
  private readonly resolutionCode = process.env.ONEC_RESOLUTION_CODE || 'КодРазрешения';
  
  // Cluster settings
  private readonly clusterId = process.env.CLUSTER_ID || '';
  private readonly clusterAddress = process.env.CLUSTER_ADDRESS || 'localhost';
  private readonly clusterDbms = process.env.CLUSTER_DBMS || 'PostgreSQL';
  private readonly clusterDbServer = process.env.CLUSTER_DB_SERVER || 'localhost';
  private readonly clusterDbUser = process.env.CLUSTER_DB_USER || 'postgres';
  private readonly clusterDbPassword = process.env.CLUSTER_DB_PASSWORD || '';
  private readonly clusterLocale = process.env.CLUSTER_LOCALE || 'ru_RU';
  private readonly clusterDefUser = process.env.CLUSTER_DEF_USER || 'Admin';
  private readonly clusterDefPwd = process.env.CLUSTER_DEF_PWD || '';

  constructor() {
    if (!fs.existsSync(this.logsDir)) {
      fs.mkdirSync(this.logsDir, { recursive: true });
    }
  }

  /**
   * Формирует путь к серверу 1С в формате cluster:address/name
   */
  buildServerPath(baseName: string): string {
    return `${this.clusterAddress}/${baseName}`;
  }

  /**
   * Создает информационную базу в кластере 1С с помощью rac.exe
   */
  async executeCreateBaseCommand(base: Base1C): Promise<CreateBaseResult> {
    return new Promise((resolve) => {
      if (!this.clusterId) {
        resolve({ success: false, error: 'CLUSTER_ID не настроен' });
        return;
      }

      // Экранирование специальных символов в паролях и путях
      const escapedRacPath = this.racPath;
      const escapedClusterId = this.clusterId;
      const escapedBaseName = base.name.replace(/"/g, '\\"');
      const escapedDbServer = this.clusterDbServer.replace(/"/g, '\\"');
      const escapedDbUser = this.clusterDbUser.replace(/"/g, '\\"');
      const escapedDbPassword = this.clusterDbPassword.replace(/"/g, '\\"');
      const escapedLocale = this.clusterLocale;

      // Формируем команду rac для создания базы в кластере
      const command = `"${escapedRacPath}" infobase --cluster=${escapedClusterId} create --name=${escapedBaseName} --dbms=${this.clusterDbms} --db-server=${escapedDbServer} --db-name=${escapedBaseName} --db-user=${escapedDbUser} --db-pwd=${escapedDbPassword} --locale=${escapedLocale} --create-database`;

      this.logger.log(`Выполнение команды создания базы: ${command}`);

      const process = exec(command);
      let output = '';
      let errorOutput = '';

      process.stdout?.on('data', (data) => {
        const dataStr = data.toString();
        output += dataStr;
        this.logger.log(`rac stdout: ${dataStr}`);
      });

      process.stderr?.on('data', (data) => {
        const dataStr = data.toString();
        errorOutput += dataStr;
        this.logger.error(`rac stderr: ${dataStr}`);
      });

      process.on('close', (code) => {
        this.logger.log(`Процесс создания базы завершен с кодом: ${code}`);
        
        if (code === 0) {
          // Извлекаем ID созданной базы из вывода (формат: UUID)
          const uuidMatch = output.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
          const infobaseId = uuidMatch ? uuidMatch[0] : undefined;
          
          this.logger.log(`База в кластере создана успешно, ID: ${infobaseId}`);
          resolve({ success: true, infobaseId });
        } else {
          this.logger.error(`Ошибка создания базы в кластере, код: ${code}`);
          resolve({ success: false, error: errorOutput || `Ошибка выполнения команды (код: ${code})` });
        }
      });

      process.on('error', (error) => {
        this.logger.error(`Ошибка процесса создания базы: ${error.message}`);
        resolve({ success: false, error: error.message });
      });
    });
  }

  executeRestoreCommand(
    base: Base1C,
    dtPath: string,
    callback: (log: string, status: BaseStatus) => Promise<void>,
    isFirstRestore: boolean = false, // Флаг первого восстановления (пустая база)
  ): void {
    const logPath = path.join(this.logsDir, `base_${base.id}.log`);

    // При первом восстановлении (пустая база) логин/пароль не требуются
    // При повторной загрузке используем adminUser/adminPass из базы или fallback
    const adminUser = isFirstRestore ? null : (base.adminUser || this.clusterDefUser || 'Admin');
    const adminPass = isFirstRestore ? null : (base.adminPass || this.clusterDefPwd || '');

    // Экранирование пути для команды
    const escapedOneCPath = this.oneCPath;
    const escapedServerPath = base.serverPath.replace(/"/g, '\\"');
    const escapedDtPath = dtPath.replace(/"/g, '\\"');
    const escapedLogPath = logPath.replace(/"/g, '\\"');
    const escapedResolutionCode = this.resolutionCode.replace(/"/g, '\\"');

    // Формируем команду: при первом восстановлении не указываем /N и /P
    let command = `"${escapedOneCPath}" CONFIG /S"${escapedServerPath}" /RestoreIB "${escapedDtPath}" /Out "${escapedLogPath}" /UC "${escapedResolutionCode}"`;
    
    if (!isFirstRestore && adminUser && adminPass) {
      const escapedAdminUser = adminUser.replace(/"/g, '\\"');
      const escapedAdminPass = adminPass.replace(/"/g, '\\"');
      command = `"${escapedOneCPath}" CONFIG /S"${escapedServerPath}" /N"${escapedAdminUser}" /P"${escapedAdminPass}" /RestoreIB "${escapedDtPath}" /Out "${escapedLogPath}" /UC "${escapedResolutionCode}"`;
    }

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
