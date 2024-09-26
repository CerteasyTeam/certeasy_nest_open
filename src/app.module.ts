import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { APP_GUARD, APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { CacheModule, CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
// import { redisStore } from 'cache-manager-redis-store';
import { redisStore } from 'cache-manager-redis-yet';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { BullModule } from '@nestjs/bull';
import { HttpModule } from '@nestjs/axios';
// configModuleOptions
import { configModuleOptions } from './config';
// @app/common
import {
  AllExceptionsFilter,
  LoggingInterceptor,
  TransformInterceptor,
  AuthGuard,
  AuthStrategy,
  AcmeChallengeMiddleware,
} from '@app/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
// @app/modules
import {
  AuthModule,
  UserModule,
  CommonModule,
  MessageModule,
  CertificateModule,
  DnsModule,
  CloudModule,
  WatchModule,
  NotificationModule,
  CoinModule,
} from '@app/modules';
// share
import {
  AcmeModule,
  AlipayModule,
  ValidationModule,
  BillingModule,
  WechatModule,
} from '@app/share';

// MysqlConnectionCredentialsOptions
import type { MysqlConnectionCredentialsOptions } from 'typeorm/driver/mysql/MysqlConnectionCredentialsOptions';

type MysqlConnectionItem = [string, number, string, string, string];
type SlaveList = MysqlConnectionItem[];
type SlaveTargetList = MysqlConnectionCredentialsOptions[];

/**
 * 创建从库链接数据库连接池配置
 * @param slavesConfig
 */
function createReplicationSlaves(slavesConfig: string): SlaveTargetList {
  const configs: SlaveList = slavesConfig ? JSON.parse(slavesConfig) : [];
  const slaves: SlaveTargetList = [];
  for (const [host, port, database, username, password] of configs) {
    slaves.push({
      host,
      port,
      database,
      username,
      password,
    });
  }
  return slaves;
}

@Module({
  imports: [
    ConfigModule.forRoot(configModuleOptions),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        // 处理 slaves
        const slaves = configService.get<string>('database.slaves');
        const replicationSlaves = createReplicationSlaves(slaves);
        return {
          replication: {
            master: {
              host: configService.get<string>('database.host'),
              port: configService.get<number | undefined>('database.port'),
              database: configService.get<string>('database.name'),
              username: configService.get<string>('database.user'),
              password: configService.get<string>('database.pass'),
            },
            slaves: replicationSlaves,
            defaultMode: replicationSlaves.length ? 'slave' : 'master', // 如果有配置主从同步/复制，则配置 slave
          },
          type: configService.get<'mysql' | 'mariadb'>('database.type'),
          entityPrefix: configService.get<string>('database.prefix'),
          entities: [],
          timezone: '+08:00',
          dateStrings: true,
          autoLoadEntities: true,
          synchronize: false,
          insecureAuth: true, //  允许连接到要求旧（不安全）身份验证方法的 MySQL 实例
          supportBigNumbers: true,
          logging:
            configService.get<string>('app.env', 'development') ===
            'development',
          // debug:
          //   configService.get<string>('app.env', 'development') === 'development',
        };
      },
    }),
    ScheduleModule.forRoot(),
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        return {
          store: await redisStore({
            url: `redis://${configService.get<string>(
              'redis.host',
              '127.0.0.1',
            )}:${configService.get<number>(
              'redis.port',
              6379,
            )}/${configService.get<number>('redis.db', 10)}`,
            password: configService.get<string>('redis.auth_pass'),
          }),
          host: configService.get<string>('redis.host'),
          port: configService.get<number>('redis.port'),
          password: configService.get<string>('redis.auth_pass'),
          db: configService.get<number>('redis.db'),
        };
      },
    }),
    JwtModule.registerAsync({
      global: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('jwt.secret_key'),
        signOptions: {
          algorithm: 'HS256',
          expiresIn: '24h',
        },
      }),
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        redis: {
          host: configService.get<string>('redis.host'),
          port: configService.get<number>('redis.port'),
          password: configService.get<string>('redis.auth_pass'),
          db: configService.get<number>('redis.db'),
        },
      }),
    }),
    HttpModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        timeout: configService.get<number>('http.timeout', 10e3),
      }),
    }),
    AuthModule,
    UserModule,
    CommonModule,
    MessageModule,
    CertificateModule,
    DnsModule,
    CloudModule,
    WatchModule,
    NotificationModule,
    CoinModule,
    // share
    AcmeModule,
    AlipayModule,
    ValidationModule,
    BillingModule,
    WechatModule,
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
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
    AppService,
    JwtService,
    AuthStrategy,
    ConfigService,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AcmeChallengeMiddleware).forRoutes('*');
  }
}
