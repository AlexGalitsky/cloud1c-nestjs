import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { BasesModule } from './bases/bases.module';
import { CommandExecutorModule } from './command-executor/command-executor.module';
import { DtFilesModule } from './dt-files/dt-files.module';
import { User } from './auth/entities/user.entity';
import { Base1C } from './bases/entities/base1c.entity';
import { DtFile } from './dt-files/entities/dt-file.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_HOST', 'localhost'),
        port: configService.get<number>('DB_PORT', 5432),
        username: configService.get('DB_USERNAME', 'postgres'),
        password: configService.get('DB_PASSWORD', 'postgres'),
        database: configService.get('DB_DATABASE', 'cloud1c'),
        entities: [User, Base1C, DtFile],
        synchronize: configService.get('NODE_ENV') !== 'production',
      }),
      inject: [ConfigService],
    }),
    AuthModule,
    BasesModule,
    CommandExecutorModule,
    DtFilesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
