import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppException } from '@app/common';
import { HttpService } from '@nestjs/axios';
import * as dayjs from 'dayjs';

@Injectable()
export class QYApiChannelService {
  // logger
  readonly logger = new Logger(QYApiChannelService.name);
  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {}

  /**
   * 构建数据
   * @param template
   * @param content
   * @private
   */
  private builderQyNotificationContent(
    template: string | number,
    content: any,
  ) {
    let defaultContent: any = {
      msgtype: 'template_card',
      template_card: {
        card_type: 'text_notice',
        source: {
          icon_url: 'https://pub-oss.certeasy.cn/icon.png',
          desc: 'Certeasy 证书自动化',
          desc_color: 0,
        },
        main_title: {
          title: '证书即将到期通知',
        },
        jump_list: [
          {
            type: 1,
            url: 'https://app.certeasy.cn/?from=openApi',
            title: 'Certeasy 控制台',
          },
        ],
        card_action: {
          type: 1,
          url: 'https://app.certeasy.cn/?from=openApi',
        },
      },
    };
    // 看类型设置不同的title
    if (template === 1) {
      // 证书即将到期通知
      defaultContent = {
        ...defaultContent,
        ...{
          template_card: {
            ...defaultContent.template_card,
            main_title: {
              title: '证书即将到期通知',
              desc: '您有即将到期证书，请及时处理',
            },
            emphasis_content: {
              title: content?.certificates?.length || 0,
              desc: '即将过期',
            },
            sub_title_text: '证书列表',
            horizontal_content_list: content?.certificates.map((cert) => {
              return {
                keyname: '证书名称',
                value: cert?.alias || cert?.name, // value 不超过26字
              };
            }),
          },
        },
      };
    } else if (template === 2) {
      // 证书更新结果通知
      defaultContent = {
        ...defaultContent,
        template_card: {
          ...defaultContent.template_card,
          main_title: {
            title: '证书更新结果通知',
            desc: '您的证书已自动更新完成',
          },
          sub_title_text: '证书列表',
          horizontal_content_list: content?.certificates.map((cert: any) => {
            return {
              keyname: '证书名称',
              value: cert?.alias || cert?.name, // value 不超过26字
            };
          }),
        },
      };
    } else if (template === 3) {
      // 证书更新结果通知
      defaultContent = {
        ...defaultContent,
        template_card: {
          ...defaultContent.template_card,
          main_title: {
            title: '证书监控异常通知',
            desc: '您监控的域名证书存在异常',
          },
          emphasis_content: {
            title: content?.certificates?.length || 0,
            desc: '监控异常',
          },
          sub_title_text: '监控列表',
          horizontal_content_list: content?.certificates.map((cert: any) => {
            return {
              keyname: '监控名称',
              value: cert?.alias || cert?.name, // value 不超过26字
            };
          }),
        },
      };
    } else if (template === 4) {
      defaultContent = {
        ...defaultContent,
        template_card: {
          ...defaultContent.template_card,
          main_title: {
            title: '余额不足通知',
            desc: '您的账户金币余额不足，请及时充值',
          },
          emphasis_content: {
            title: content.coin || 0,
            desc: '可用金币',
          },
        },
      };
    } else if (template === 5) {
      // 部署结果是在部署后发送的，部署会有多个clouds
      const successCount = content?.clouds.filter(
        (cloud: any) => cloud.status === 2,
      ).length;
      const failedCount = content?.clouds.filter(
        (cloud: any) => cloud.status === 0,
      ).length;
      defaultContent = {
        ...defaultContent,
        template_card: {
          ...defaultContent.template_card,
          main_title: {
            title: '云资源部署结果通知',
            desc: `您的证书云资源部署 ${successCount}成功${failedCount ? '、' + failedCount + '失败，请及时处理' : ''}`,
          },
          sub_title_text: '资源列表',
          horizontal_content_list: content?.clouds.map((cloud: any) => {
            return {
              keyname: '资源名称',
              value: cloud?.alias || cloud?.name, // value 不超过26字
            };
          }),
        },
      };
    } else if (template === 6) {
      defaultContent = {
        ...defaultContent,
        template_card: {
          ...defaultContent.template_card,
          main_title: {
            title: '金币充值结果通知',
            desc: '您的金币余额充值成功，感谢您的支持',
          },
          emphasis_content: {
            title: content.coin || 0,
            desc: '充值金币',
          },
        },
      };
    }
    return defaultContent;
  }

  private builderNotificationCheck() {
    return {
      msgtype: 'template_card',
      template_card: {
        card_type: 'text_notice',
        source: {
          icon_url: 'https://pub-oss.certeasy.cn/icon.png',
          desc: 'Certeasy 证书自动化',
          desc_color: 0,
        },
        main_title: {
          title: '发送通知测试',
          desc: '本次仅为测试发送，请您检查后忽略即可',
        },
        emphasis_content: {
          title: dayjs().format('YYYYMMDD'),
        },
        jump_list: [
          {
            type: 1,
            url: 'https://app.certeasy.cn/?from=openApi',
            title: 'Certeasy 控制台',
          },
        ],
        card_action: {
          type: 1,
          url: 'https://app.certeasy.cn/?from=openApi',
        },
      },
    };
  }
  /**
   * 发送消息
   * @param options
   * @param check
   */
  async sendNotification(options: any, check = false) {
    const sendData = check
      ? this.builderNotificationCheck()
      : this.builderQyNotificationContent(options?.template, options?.content);
    try {
      const response = await this.httpService
        .post(options?.accessJson?.url, sendData, {
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
