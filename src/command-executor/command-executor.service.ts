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
  private readonly ibCmdPath = process.env.IB_CMD_PATH || 'C:\\Program Files\\1cv8\\8.3.18.1208\\bin\\ibcmd.exe';
  private readonly racPath = process.env.RAC_PATH || 'C:\\Program Files\\1cv8\\8.3.18.1208\\bin\\rac.exe';
  private readonly webinstPath = process.env.WEBINST_PATH || 'C:\\Program Files\\1cv8\\8.3.18.1208\\bin\\webinst.exe';
  private readonly logsDir = path.join(process.cwd(), 'logs');
  private readonly wwwRoot = process.env.WWW_ROOT || 'C:\\inetpub\\wwwroot';
  
  // Cluster settings
  private readonly clusterId = process.env.CLUSTER_ID || '';
  private readonly clusterAddress = process.env.CLUSTER_ADDRESS || 'localhost';
  private readonly clusterDbms = process.env.CLUSTER_DBMS || 'PostgreSQL';
  private readonly clusterDbServer = process.env.CLUSTER_DB_SERVER || 'localhost';
  private readonly clusterDbUser = process.env.CLUSTER_DB_USER || 'postgres';
  private readonly clusterDbPassword = process.env.CLUSTER_DB_PASSWORD || '';
  private readonly clusterLocale = process.env.CLUSTER_LOCALE || 'ru_RU';
  
  // Флаг необходимости указания логина/пароля ИБ (требуется для версий 1С >= 8.3.1741)
  private readonly isUserPassRequired = process.env.IB_USER_PASS_REQUIRED === 'true';
  private readonly ibUser = process.env.IB_USER || 'Admin';
  private readonly ibPassword = process.env.IB_PASSWORD || '';

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
      const command = `"${escapedRacPath}" infobase --cluster=${escapedClusterId} create --name=${escapedBaseName} --dbms=${this.clusterDbms} --db-server=${escapedDbServer} --db-name=${escapedBaseName} --db-user=${escapedDbUser} --db-pwd=${escapedDbPassword} --locale=${escapedLocale} --create-database --license-distribution=allow`;

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

  /**
   * Восстанавливает базу из .dt файла с помощью ibcmd.exe
   * Логин/пароль от ИБ указываются только если isUserPassRequired=true (для 1С >= 8.3.1741)
   * Если adminUser/adminPass переданы - используются они, иначе пустые значения (для is_empty=true)
   */
  executeRestoreCommand(
    base: Base1C,
    dtPath: string,
    callback: (log: string, status: BaseStatus) => Promise<void>,
    adminUser?: string,
    adminPass?: string,
  ): void {
    const logPath = path.join(this.logsDir, `base_${base.id}.log`);

    // Экранирование путей
    const escapedIbCmdPath = this.ibCmdPath;
    const escapedDtPath = dtPath.replace(/"/g, '\\"');
    const escapedLogPath = logPath.replace(/"/g, '\\"');
    const escapedDbServer = this.clusterDbServer.replace(/"/g, '\\"');
    const escapedDbUser = this.clusterDbUser.replace(/"/g, '\\"');
    const escapedDbPassword = this.clusterDbPassword.replace(/"/g, '\\"');

    // Формируем команду ibcmd для восстановления
    // Базовая команда: ibcmd.exe infobase restore --dbms=PostgreSQL --db-server=... --db-name=... --db-user=... --db-pwd=... "file.dt"
    // Добавляем chcp 65001 для корректной кодировки UTF-8
    let command = `chcp 65001 >nul && "${escapedIbCmdPath}" infobase restore --dbms=${this.clusterDbms} --db-server=${escapedDbServer} --db-name=${base.name} --db-user=${escapedDbUser} --db-pwd=${escapedDbPassword} "${escapedDtPath}" > "${escapedLogPath}" 2>&1`;

    // Для версий 1С >= 8.3.1741 требуется указывать логин/пароль от ИБ
    if (this.isUserPassRequired) {
      // Используем переданные логин/пароль или пустые значения
      const escapedIbUser = (adminUser || '').replace(/"/g, '\\"');
      const escapedIbPassword = (adminPass || '').replace(/"/g, '\\"');
      command = `chcp 65001 >nul && "${escapedIbCmdPath}" infobase restore --dbms=${this.clusterDbms} --db-server=${escapedDbServer} --db-name=${base.name} --db-user=${escapedDbUser} --db-pwd=${escapedDbPassword} --user=${escapedIbUser} --password=${escapedIbPassword} "${escapedDtPath}" > "${escapedLogPath}" 2>&1`;
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

  /**
   * Публикует базу на веб-сервере IIS с помощью webinst.exe
   */
  async publishBase(
    base: Base1C,
    callback: (log: string, success: boolean) => Promise<void>,
  ): Promise<void> {
    const logPath = path.join(this.logsDir, `publish_base_${base.id}.log`);
    const wwwDir = path.join(this.wwwRoot, base.name);

    // Создаем директорию для публикации если не существует
    if (!fs.existsSync(wwwDir)) {
      fs.mkdirSync(wwwDir, { recursive: true });
      this.logger.log(`Создана директория для публикации: ${wwwDir}`);
    }

    // Экранирование путей
    const escapedWebinstPath = this.webinstPath;
    const escapedWsDir = base.name.replace(/"/g, '\\"');
    const escapedDir = wwwDir.replace(/"/g, '\\"');
    const escapedLogPath = logPath.replace(/"/g, '\\"');
    const clusterAddress = this.clusterAddress || 'localhost';

    // Формируем команду webinst для публикации
    // webinst.exe -publish -iis -wsdir <alias> -dir <path> -connstr "Srvr=<server>;Ref=<base>;"
    // Добавляем chcp 65001 для корректной кодировки UTF-8
    const command = `chcp 65001 >nul && "${escapedWebinstPath}" -publish -iis -wsdir "${escapedWsDir}" -dir "${escapedDir}" -connstr "Srvr=${clusterAddress};Ref=${base.name};" > "${escapedLogPath}" 2>&1`;

    this.logger.log(`Выполнение команды публикации: ${command}`);

    const process = exec(command);

    process.stdout?.on('data', (data) => {
      this.logger.log(`stdout: ${data}`);
    });

    process.stderr?.on('data', (data) => {
      this.logger.error(`stderr: ${data}`);
    });

    process.on('close', async (code) => {
      this.logger.log(`Процесс публикации завершен с кодом: ${code}`);

      let logContent = '';
      if (fs.existsSync(logPath)) {
        logContent = fs.readFileSync(logPath, 'utf-8');
      }

      if (code === 0) {
        this.logger.log(`База ${base.id} успешно опубликована`);

        // Формируем и сохраняем файл default.vrd
        const vrdContent = `<?xml version="1.0" encoding="UTF-8"?>
<point xmlns="http://v8.1c.ru/8.2/virtual-resource-system"
xmlns:xs="http://www.w3.org/2001/XMLSchema"
xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
base="/${base.name}"
ib="Srvr=${clusterAddress};Ref=${base.name};">
<standardOdata enable="false"
reuseSessions="autouse"
sessionMaxAge="20"
poolSize="10"
poolTimeout="5"/>
<analytics enable="true"/>
<httpServices publishByDefault="true" />
</point>`;

        const vrdPath = path.join(wwwDir, 'default.vrd');
        fs.writeFileSync(vrdPath, vrdContent, 'utf-8');
        this.logger.log(`Файл default.vrd создан: ${vrdPath}`);

        await callback(logContent || 'База успешно опубликована', true);
      } else {
        this.logger.error(`Ошибка при публикации базы ${base.id}, код: ${code}`);
        await callback(logContent || `Ошибка выполнения команды (код: ${code})`, false);
      }
    });

    process.on('error', async (error) => {
      this.logger.error(`Ошибка процесса публикации: ${error.message}`);
      await callback(`Ошибка процесса: ${error.message}`, false);
    });
  }

  /**
   * Снимает базу с публикации на веб-сервере IIS
   */
  async unpublishBase(
    base: Base1C,
    callback: (log: string, success: boolean) => Promise<void>,
  ): Promise<void> {
    const logPath = path.join(this.logsDir, `unpublish_base_${base.id}.log`);

    // Экранирование путей
    const escapedWebinstPath = this.webinstPath;
    const escapedWsDir = base.name.replace(/"/g, '\\"');
    const escapedLogPath = logPath.replace(/"/g, '\\"');

    // Формируем команду webinst для снятия с публикации
    // webinst.exe -publish -iis -wsdir <alias> -delete
    // Добавляем chcp 65001 для корректной кодировки UTF-8
    const command = `chcp 65001 >nul && "${escapedWebinstPath}" -iis -wsdir "${escapedWsDir}" -delete > "${escapedLogPath}" 2>&1`;

    this.logger.log(`Выполнение команды снятия с публикации: ${command}`);

    const process = exec(command);

    process.stdout?.on('data', (data) => {
      this.logger.log(`stdout: ${data}`);
    });

    process.stderr?.on('data', (data) => {
      this.logger.error(`stderr: ${data}`);
    });

    process.on('close', async (code) => {
      this.logger.log(`Процесс снятия с публикации завершен с кодом: ${code}`);

      let logContent = '';
      if (fs.existsSync(logPath)) {
        logContent = fs.readFileSync(logPath, 'utf-8');
      }

      if (code === 0) {
        this.logger.log(`Публикация базы ${base.id} успешно снята`);
        await callback(logContent || 'Публикация успешно снята', true);
      } else {
        this.logger.error(`Ошибка при снятии публикации базы ${base.id}, код: ${code}`);
        await callback(logContent || `Ошибка выполнения команды (код: ${code})`, false);
      }
    });

    process.on('error', async (error) => {
      this.logger.error(`Ошибка процесса снятия с публикации: ${error.message}`);
      await callback(`Ошибка процесса: ${error.message}`, false);
    });
  }

  /**
   * Удаляет базу из кластера 1С с помощью rac.exe
   */
  async deleteBaseFromCluster(
    base: Base1C,
    callback: (log: string, success: boolean) => Promise<void>,
  ): Promise<void> {
    const logPath = path.join(this.logsDir, `delete_cluster_base_${base.id}.log`);
    const escapedLogPath = logPath.replace(/"/g, '\\"');

    if (!this.clusterId) {
      await callback('CLUSTER_ID не настроен', false);
      return;
    }

    // Экранирование путей
    const escapedRacPath = this.racPath;
    const escapedClusterId = this.clusterId;

    // Формируем команду rac для удаления базы
    // rac.exe infobase --cluster=<id> drop --infobase=<guid>
    // Добавляем chcp 65001 для корректной кодировки UTF-8
    // Используем clusterGuid если есть, иначе пытаемся использовать id
    const infobaseId = base.clusterGuid || String(base.id);
    const command = `chcp 65001 >nul && "${escapedRacPath}" infobase --cluster=${escapedClusterId} drop --infobase=${infobaseId} > "${escapedLogPath}" 2>&1`;

    this.logger.log(`Выполнение команды удаления из кластера: ${command}`);

    const process = exec(command);

    process.stdout?.on('data', (data) => {
      this.logger.log(`stdout: ${data}`);
    });

    process.stderr?.on('data', (data) => {
      this.logger.error(`stderr: ${data}`);
    });

    process.on('close', async (code) => {
      this.logger.log(`Процесс удаления из кластера завершен с кодом: ${code}`);

      let logContent = '';
      if (fs.existsSync(logPath)) {
        logContent = fs.readFileSync(logPath, 'utf-8');
      }

      if (code === 0) {
        this.logger.log(`База ${base.id} успешно удалена из кластера`);
        await callback(logContent || 'База успешно удалена из кластера', true);
      } else {
        this.logger.error(`Ошибка при удалении базы ${base.id} из кластера, код: ${code}`);
        await callback(logContent || `Ошибка выполнения команды (код: ${code})`, false);
      }
    });

    process.on('error', async (error) => {
      this.logger.error(`Ошибка процесса удаления из кластера: ${error.message}`);
      await callback(`Ошибка процесса: ${error.message}`, false);
    });
  }

  /**
   * Удаляет базу данных PostgreSQL через прямое подключение
   */
  async dropDatabase(
    base: Base1C,
    callback: (log: string, success: boolean) => Promise<void>,
  ): Promise<void> {
    const { Client } = require('pg');
    
    const client = new Client({
      host: this.clusterDbServer,
      port: 5432,
      user: this.clusterDbUser,
      password: this.clusterDbPassword,
      database: 'postgres', // Подключаемся к default базе
    });

    try {
      await client.connect();
      this.logger.log(`Подключено к PostgreSQL для удаления БД ${base.name}`);

      // Завершаем все активные подключения к удаляемой базе
      await client.query(`
        SELECT pg_terminate_backend(pid)
        FROM pg_stat_activity
        WHERE datname = '${base.name}'
      `);

      // Удаляем базу данных
      await client.query(`DROP DATABASE IF EXISTS "${base.name}"`);
      
      this.logger.log(`База данных ${base.name} успешно удалена`);
      await callback(`База данных ${base.name} успешно удалена`, true);
    } catch (error: any) {
      this.logger.error(`Ошибка при удалении БД ${base.name}: ${error.message}`);
      await callback(`Ошибка выполнения: ${error.message}`, false);
    } finally {
      await client.end();
    }
  }
}
