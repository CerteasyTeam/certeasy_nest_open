import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ISendMailOptions, MailerService } from '@nestjs-modules/mailer';
import * as dayjs from 'dayjs';
import * as _ from 'lodash';
import { DATE_FORMAT } from '@app/common';

@Injectable()
export class EmailChannelService {
  // logger
  readonly logger = new Logger(EmailChannelService.name);
  constructor(
    private readonly configService: ConfigService,
    private readonly mailerService: MailerService,
  ) {}

  /**
   * 构建邮件内容
   * @param user
   * @param template
   * @param content
   */
  builderNotificationContent(
    user: IUserPayload,
    template: string | number,
    content: any,
  ) {
    if (template === 1) {
      return (
        `<tr>
    <td style="padding: 20px 7.5% 0;">
      您的账号 ${user.email} 有域名证书即将到期或已到期，详情如下：
    </td>
  </tr>
  <tr>
    <td style="padding: 20px 7.5% 0;">
      <table style="text-align: left; border-collapse: collapse; border-color: rgb(221, 221, 221); width: 550px; word-break: break-all; height: auto;" border="0" cellpadding="0" cellspacing="0">
        <thead style="background-color:#f5f7f8;">
        <tr>
          <th style="padding:5px 8px;text-align:left;border:1px solid #e9e9e9;">证书名称</th>
          <th style="padding:5px 8px;text-align:left;border:1px solid #e9e9e9;">证书域名</th>
          <th style="padding:5px 8px;text-align:left;border:1px solid #e9e9e9;">到期时间</th>
        </tr>
        </thead>
        <tbody>` +
        content?.certificates
          ?.map((cert: any) => {
            return `<tr>
          <td style="padding:5px 8px;text-align:left;border:1px solid #e9e9e9;">${cert.alias || cert.name}</td>
          <td style="padding:5px 8px;text-align:left;border:1px solid #e9e9e9;">${_.first(cert.domains)}</td>
          <td style="padding:5px 8px;text-align:left;border:1px solid #e9e9e9;">${cert?.expiredTime}${cert?.status === 3 ? '<span style="font-size: 12px;color: #f31414;">（已过期）</span>' : ''}</td>
        </tr>`;
          })
          .join('') +
        `
        </tbody>
      </table>
    </td>
  </tr>
  <tr>
    <td style="padding: 20px 7.5% 0;">请您及时更新域名证书，防止业务域名无法访问！</td>
  </tr>`
      );
    } else if (template === 2) {
      return (
        `<tr>
    <td style="padding: 20px 7.5% 0;">
      您的账号 ${user.email} 有证书更新成功，详情如下：
    </td>
  </tr>
  <tr>
    <td style="padding: 20px 7.5% 0;">
      <table style="text-align: left; border-collapse: collapse; border-color: rgb(221, 221, 221); width: 450px; word-break: break-all; height: auto;" border="0" cellpadding="0" cellspacing="0">
        <tbody>` +
        content?.certificates
          ?.map((cert: any) => {
            return `<tr>
          <td style="width: 100px;padding:5px 8px;text-align:left;border:1px solid #e9e9e9;">证书名称</td>
          <td style="padding:5px 8px;text-align:left;border:1px solid #e9e9e9;">${cert.alias || cert.name}</td>
        </tr>
        <tr>
          <td style="width: 100px;padding:5px 8px;text-align:left;border:1px solid #e9e9e9;">证书域名</td>
          <td style="padding:5px 8px;text-align:left;border:1px solid #e9e9e9;">${_.first(cert.domains)}</td>
        </tr>
        <tr>
          <td style="width: 100px;padding:5px 8px;text-align:left;border:1px solid #e9e9e9;">更新状态</td>
          <td style="padding:5px 8px;text-align:left;border:1px solid #e9e9e9;">
            <span>${cert.status <= 0 ? '<font color="#f31414">更新失败</font>' : '<font color="#09a755">更新成功</font>'}</span>
          </td>
        </tr>
        <tr>
          <td style="width: 100px;padding:5px 8px;text-align:left;border:1px solid #e9e9e9;">到期时间</td>
          <td style="padding:5px 8px;text-align:left;border:1px solid #e9e9e9;">${cert.expiredTime}</td>
        </tr>`;
          })
          .join('') +
        `
        </tbody>
      </table>
    </td>
  </tr>
  <tr>
    <td style="padding: 20px 7.5% 0;">
      您的证书更新成功，请及时更新同步至您的云资源。
      <br/>如证书存在自动部署，系统将会自动同步证书部署至云资源，具体部署结果还请您及时检查。</td>
  </tr>`
      );
    } else if (template === 3) {
      return (
        `<tr>
    <td style="padding: 20px 7.5% 0;">
      您的账号 ${user.email} 有监控域名证书即将到期、已到期或已吊销，详情如下：
    </td>
  </tr>
  <tr>
    <td style="padding: 20px 7.5% 0;">
      <table style="text-align: left; border-collapse: collapse; border-color: rgb(221, 221, 221); width: 550px; word-break: break-all; height: auto;" border="0" cellpadding="0" cellspacing="0">
        <thead style="background-color:#f5f7f8;">
        <tr>
          <th style="padding:5px 8px;text-align:left;border:1px solid #e9e9e9;">监控域名</th>
          <th style="padding:5px 8px;text-align:left;border:1px solid #e9e9e9;">到期时间</th>
        </tr>
        </thead>
        <tbody>` +
        content?.certificates
          ?.map((cert: any) => {
            return `<tr>
          <td style="padding:5px 8px;text-align:left;border:1px solid #e9e9e9;">${_.first(cert.domains)}</td>
          <td style="padding:5px 8px;text-align:left;border:1px solid #e9e9e9;">${cert?.expiredTime}</td>
        </tr>`;
          })
          .join('') +
        `
        </tbody>
      </table>
    </td>
  </tr>
  <tr>
    <td style="padding: 20px 7.5% 0;">
      请您及时更新以上监控域名的证书，防止证书过期导致业务中断。
    </td>
  </tr>`
      );
    } else if (template === 4) {
      return `<tr>
    <td style="padding: 20px 7.5% 0;">
      您的账号 ${user.email} 金币余额不足，您的金币剩余：
    </td>
  </tr>
  <tr>
    <td style="padding: 20px 7.5% 0;">
      <span style="font-size: 26px; line-height:32px;color: #333; text-decoration: none;cursor:text;"><b>${content?.coin || 0}</b></span>
    </td>
  </tr>
  <td style="padding: 20px 7.5% 0;">
    请您及时进行充值，防止因金币不足导致证书更新异常等。
  </td>`;
    } else if (template === 5) {
      // 云资源部署结果通知
      return (
        `<tr>
    <td style="padding: 20px 7.5% 0;">
      您的账号 ${user.email} 有云资源证书部署，详情如下：
    </td>
  </tr>
  <tr>
    <td style="padding: 20px 7.5% 0;">
      <table style="text-align: left; border-collapse: collapse; border-color: rgb(221, 221, 221); width: 550px; word-break: break-all; height: auto;" border="0" cellpadding="0" cellspacing="0">
        <thead style="background-color:#f5f7f8;">
        <tr>
          <th style="padding:5px 8px;text-align:left;border:1px solid #e9e9e9;">云资源</th>
          <th style="padding:5px 8px;text-align:left;border:1px solid #e9e9e9;">证书名称</th>
          <th style="padding:5px 8px;text-align:left;border:1px solid #e9e9e9;">部署结果</th>
        </tr>
        </thead>
        <tbody>` +
        content?.clouds
          ?.map((cloud: any) => {
            return `<tr>
          <td style="padding:5px 8px;text-align:left;border:1px solid #e9e9e9;"><img src="${cloud?.providerLogo}" width="24px" />${cloud?.providerName} - ${cloud?.providerProductName}<br/>${cloud?.name}</td>
          <td style="padding:5px 8px;text-align:left;border:1px solid #e9e9e9;">${cloud.certificate}<br/>${_.first(cloud.domains)}</td>
          <td style="padding:5px 8px;text-align:left;border:1px solid #e9e9e9;">
            <span>${cloud.status <= 0 ? '<font color="#f31414">失败</font>' : '<font color="#09a755">成功</font>'}</span>
          </td>
        </tr>
${cloud.status <= 0 ? '<td style="padding:5px 8px;text-align:left;border:1px solid #e9e9e9;" colspan="3"><span style="color: #e54545">失败原因：${cloud?.error}</span></td>' : ''}`;
          })
          .join('') +
        `
        </tbody>
      </table>
    </td>
  </tr>
  <tr>
    <td style="padding: 20px 7.5% 0;">
      请您及时检查云资源证书部署结果，防止因部署超时或者其他问题导致业务中断。
    </td>
  </tr>`
      );
    } else if (template === 6) {
      return `<tr>
    <td style="padding: 20px 7.5% 0;">
      您的账号 ${user.email} 金币充值成功，您的金币剩余：
    </td>
  </tr>
  <tr>
    <td style="padding: 20px 7.5% 0;">
      <span style="font-size: 26px; line-height:32px;color: #333; text-decoration: none;cursor:text;"><b>${content?.coin || 0}</b></span>
    </td>
  </tr>
  <td style="padding: 20px 7.5% 0;">
    感谢您的支持，如有疑问请联系客服。
  </td>`;
    }
    return '<td style="padding: 20px 7.5% 0;"><b>Hello Certeasy</b></td>';
  }

  /**
   * 构建测试
   * @param user
   * @private
   */
  private builderNotificationCheck(user: any) {
    return `<tr>
    <td style="padding: 20px 7.5% 0;">
      您的账号 ${user.email} 正在进行通知测试，本次发送内容：
    </td>
  </tr>
  <tr>
    <td style="padding: 20px 7.5% 0;">
      <span style="font-size: 16px; line-height:26px;color: #000; text-decoration: none;cursor:text;">北京时间：${dayjs().format(DATE_FORMAT)}</span>
    </td>
  </tr>`;
  }

  /**
   * 发送邮件消息
   * @param options
   * @param check
   */
  async sendNotification(options: any, check = false) {
    try {
      const date = dayjs().format('YYYY年MM月DD日');
      const sendMailOptions: ISendMailOptions = {
        to: options.accessJson?.email,
        subject: `CERTEASY ${options?.notification?.name || '邮件通知'}`,
        template: 'notification.tmpl.ejs',
        //内容部分都是自定义的
        context: {
          content: check
            ? this.builderNotificationCheck(options?.user)
            : this.builderNotificationContent(
                options?.user,
                options?.template,
                options?.content,
              ),
          date,
        },
      };
      return await this.mailerService.sendMail(sendMailOptions);
    } catch (error) {
      Logger.error(error, 'commSendEmail');
      return error;
    }
  }
}
