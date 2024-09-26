import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import * as crypto from 'crypto';
import { AppException, DATE_FORMAT } from '@app/common';
import * as dayjs from 'dayjs';

@Injectable()
export class DingTalkChannelService {
  // logger
  readonly logger = new Logger(DingTalkChannelService.name);
  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {}

  builderNotificationContent(options: any) {
    const { notification, template, content } = options;
    const actionCard = {
      title: notification?.name || '消息通知',
      text: ``,
      btnOrientation: '0',
      singleTitle: 'Certeasy 控制台',
      singleURL: 'https://app.certeasy.cn/?from=openApi',
    };
    if (template === 1) {
      actionCard!.text =
        `### ${notification?.name || '消息通知'}
###### 您有即将到期证书，请及时处理

##### 证书列表
` +
        content?.certificates
          .map((cert: any) => {
            return `###### 证书名称：${cert.alias || cert.name}`;
          })
          .join('\n');
    } else if (template === 2) {
      actionCard!.text =
        `### ${notification?.name || '消息通知'}
###### 您有证书自动更新完成

##### 证书列表
` +
        content?.certificates
          .map((cert: any) => {
            return `###### 证书名称：${cert.alias || cert.name}`;
          })
          .join('\n');
    } else if (template === 3) {
      actionCard!.text =
        `### ${notification?.name || '消息通知'}
###### 您监控的域名证书存在异常

##### 监控列表
` +
        content?.certificates
          .map((cert: any) => {
            return `###### 监控名称：${cert.alias || cert.name}`;
          })
          .join('\n');
    } else if (template === 4) {
      actionCard!.text = `### ${notification?.name || '消息通知'}
###### 您的账户余额不足，请及时充值

可用余额: **${content.coin}**`;
    } else if (template === 5) {
      const successCount = content?.clouds.filter(
        (cloud: any) => cloud.status === 2,
      ).length;
      const failedCount = content?.clouds.filter(
        (cloud: any) => cloud.status === 0,
      ).length;
      actionCard!.text =
        `### ${notification?.name || '消息通知'}
###### 您的证书云资源部署 ${successCount}成功${failedCount ? '、' + failedCount + '失败，请及时处理' : ''}

##### 资源列表
` +
        content?.clouds
          .map((clouds: any) => {
            return `###### 资源名称：${clouds.alias || clouds.name}`;
          })
          .join('\n');
    } else if (template === 6) {
      actionCard!.text = `### ${notification?.name || '消息通知'}
###### 您金币余额充值成功，感谢您的支持

可用余额: **${content.coin}**`;
    }

    return {
      msgtype: 'actionCard',
      actionCard,
    };
  }

  /**
   * 构建请求签名
   * @param secretKey
   */
  buildRequestSign(secretKey: string) {
    // 获取当前时间戳（毫秒）
    const timestamp = Date.now();
    // 生成签名字符串
    const signString = `${timestamp}\n${secretKey}`;
    const sign = crypto
      .createHmac('sha256', secretKey)
      .update(signString)
      .digest('base64');

    // 对签名进行 URL 编码
    return { timestamp, signEncoded: encodeURIComponent(sign) };
  }

  /**
   * 构建测试内容
   * @private
   */
  private builderNotificationCheck() {
    return {
      msgtype: 'actionCard',
      actionCard: {
        title: '消息通知 - 测试',
        text: `### 消息通知 - 测试
  ###### 本次消息仅为测试，请您检查后忽略
  
  北京时间: **${dayjs().format(DATE_FORMAT)}**`,
        btnOrientation: '0',
        singleTitle: 'Certeasy 控制台',
        singleURL: 'https://app.certeasy.cn/?from=openApi',
      },
    };
  }

  /**
   * 发送消息
   * @param options
   * @param check
   */
  async sendNotification(options: any, check = false) {
    const { url, secretKey } = options?.accessJson;
    // 签名内容
    const { timestamp, signEncoded } = this.buildRequestSign(secretKey);

    // 要发送的消息内容
    const sendData = check
      ? this.builderNotificationCheck()
      : this.builderNotificationContent(options);
    try {
      // 最终的 Webhook URL，包含签名和时间戳
      const response = await this.httpService
        .post(`${url}&timestamp=${timestamp}&sign=${signEncoded}`, sendData, {
          headers: {
            'Content-Type': 'application/json',
            UserAgent:
              'Mozilla/5.0 (compatible; Certeasy server; +https://certeasy.cn)',
          },
        })
        .toPromise();
      // 请求正常
      if (response && response?.status == 200) {
        console.log(' response.data', response.data);
        return response.data;
      }
      new Error('provider request failed.');
    } catch (err) {
      this.logger.error('request.err:', err.message);
      throw new AppException('provider request failed.');
    }
  }
}
