import { Module } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AppController } from './app.controller';
import { AppService } from './app.service';

// configModuleOptions
import { configModuleOptions } from './config';
// @app/common
import {
  AllExceptionsFilter,
  LoggingInterceptor,
  TransformInterceptor,
} from '@app/common';

@Module({
  imports: [
    ConfigModule.forRoot(configModuleOptions),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        return {
          type: configService.get<'mysql' | 'mariadb'>(
            'database.type',
            'mysql',
          ),
          host: configService.get<string>('database.host', '127.0.0.1'),
          port: configService.get<number | undefined>('database.port', 3306),
          database: configService.get<string>('database.name', 'certeasy'),
          username: configService.get<string>('database.user', 'root'),
          password: configService.get<string>('database.pass', '123456'),
          entityPrefix: configService.get<string>('database.prefix', 'ce_'),
          entities: [], // 实体不在此设置，在每个模块配置
          timezone: '+08:00', // 时区
          dateStrings: true,
          autoLoadEntities: true,
          synchronize: false, // 同步
          insecureAuth: true, //  允许连接到要求旧（不安全）身份验证方法的 MySQL 实例
          supportBigNumbers: true,
          logging:
            configService.get<string>('app.env', 'development') ===
            'development',
          debug:
            configService.get<string>('app.env', 'development') ===
            'development',
        };
      },
    }),
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
    AppService,
  ],
})
export class AppModule {}
