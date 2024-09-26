import { Global, Module } from '@nestjs/common';
import { RedisCache, WeChatModule as NestWechatModule } from 'nest-wechat';
import { WechatService } from './wechat.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Global()
@Module({
  imports: [
    NestWechatModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService, CACHE_MANAGER],
      useFactory: (configService: ConfigService, cache: Cache) => ({
        appId: configService.get('third.wx_appid'),
        secret: configService.get('third.wx_secret'),
        token: configService.get('third.wx_token'),
        encodingAESKey: configService.get('third.wx_aeskey'),
        cacheAdapter: new RedisCache(cache),
        debug:
          configService.get<string>('app.env', 'development') === 'development',
      }),
    }),
  ],
  providers: [WechatService],
  exports: [WechatService],
})
export class WechatModule {}
