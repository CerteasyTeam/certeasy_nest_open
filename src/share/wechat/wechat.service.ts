import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { WeChatService } from 'nest-wechat';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { GLOBAL_CACHE_PREFIX } from '@app/common';
import * as dayjs from 'dayjs';

@Injectable()
export class WechatService {
  private readonly logger = new Logger(WechatService.name);
  /**
   * 服务类
   * @private
   */
  private service: WeChatService;
  constructor(
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
    private readonly configService: ConfigService,
  ) {
    this.service = new WeChatService({
      appId: configService.get('third.wx_appid', 'wx7d583397339cef8d'),
      secret: configService.get(
        'third.wx_secret',
        '8e8ab457bb662473ed413b0efb01c1387',
      ),
    });
  }

  /**
   * 取得授权token
   * @private
   */
  private async getAccessToken(): Promise<string> {
    const appId = this.configService.get(
      'third.wx_appid',
      'wx7d583397339cef8d',
    );
    const APPID_CACHE_KEY = GLOBAL_CACHE_PREFIX + `${appId}:token`;
    // 读取缓存
    let accessToken: string | null =
      await this.cacheManager.get(APPID_CACHE_KEY);
    if (!accessToken) {
      const { access_token, expires_in } =
        // 获取缓存
        await this.service.getAccountAccessToken(
          this.configService.get('third.wx_appid', 'wx7d583397339cef8d'),
        );
      // 设置缓存
      await this.cacheManager.set(
        APPID_CACHE_KEY,
        access_token,
        (expires_in - dayjs().unix()) * 1e3,
      );
      accessToken = access_token;
    }
    console.log(`CACHE: ${APPID_CACHE_KEY}`, accessToken);
    return accessToken;
  }

  /**
   * code2Session
   * @param code
   */
  async code2Session(code: string) {
    return await this.service.mp.code2Session(code);
  }

  /**
   * code2Session
   * @param scene
   */
  async getQrcodeUrl(scene: string) {
    const accessToken = await this.getAccessToken();
    const { data, headers } = await this.service.mp.getUnlimitedQRCode(
      {
        scene,
        width: 280,
      },
      accessToken,
      {
        responseType: 'arraybuffer',
      },
    );
    // 截取请求响应类型，是错误还是成功
    const contentType = headers['content-type'];
    if (contentType.includes('application/json')) {
      // 处理错误响应，转换为 JSON
      const errorData = JSON.parse(data.toString('utf-8'));
      throw new BadRequestException('获取二维码失败：' + errorData?.errmsg);
    } else {
      return `data:image/png;base64,${Buffer.from(data as string).toString('base64')}`;
    }
  }
}
