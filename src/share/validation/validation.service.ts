import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ISendMailOptions, MailerService } from '@nestjs-modules/mailer';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

// @app
import { randomNum } from '@app/utils';
import { CAPTCHA_CACHE_PREFIX, DATE_FORMAT } from '@app/common';
import * as dayjs from 'dayjs';

@Injectable()
export class ValidationService {
  private readonly logger = new Logger(ValidationService.name);
  constructor(
    @Inject(CACHE_MANAGER)
    private cacheManager: Cache,
    private readonly configService: ConfigService,
    private readonly mailerService: MailerService,
  ) {}

  /**
   * 发送验证码
   * @param scene
   * @param email
   * @param mock
   */
  async send(scene: string, email: string, mock = false) {
    // 前置校验频率
    const valueTtl = this.configService.get<number>('captcha.value_ttl', 300);
    const limitedFrequencyTime = await this.cacheManager.get(
      CAPTCHA_CACHE_PREFIX + `frequency:${email}`,
    );
    if (limitedFrequencyTime) {
      // 计算间隔秒数
      const secondsLeft = Math.abs(
        Math.round(dayjs(limitedFrequencyTime as Date).diff(dayjs(), 'second')),
      );
      throw new BadRequestException(
        `验证码已发送，请等待${secondsLeft}秒后再重试`,
      );
    }
    // 1. 生成校验码
    const codeNum = randomNum(1001, 9999);
    // 2.记录缓存值
    await this.cacheManager.set(
      CAPTCHA_CACHE_PREFIX + `${scene}:${email}`,
      codeNum,
      valueTtl * 1e3,
    );
    // 如果是模拟
    if (mock) return codeNum;
    // 3. 执行发件
    // 构造数据
    // todo 从配置里读取模板
    const date = dayjs().format('YYYY年MM月DD日');
    const sendMailOptions: ISendMailOptions = {
      to: email,
      subject: 'CERTEASY 邮件验证码',
      //html: `<p>尊敬的用户，您好！<p>您本次验证码为：${codeNum}，有效期5分钟。如非您本人操作请忽略。</p><p>致此</p><p>CERTEASY</p>`,
      template: 'validation.tmpl.ejs',
      //内容部分都是自定义的
      context: {
        codeNum,
        date, //日期
      },
    };

    return await this.commSendEmail(sendMailOptions);
  }

  /**
   * 验证码校验
   * @param scene
   * @param email
   * @param code
   */
  async valid(scene: string, email: string, code: string) {
    // 1.验证码读取
    const codeNum = await this.cacheManager.get(
      CAPTCHA_CACHE_PREFIX + `${scene}:${email}`,
    );
    // 2.比对验证码并删除
    if (codeNum == code) {
      // 配置是否删除
      if (this.configService.get<number>('captcha.resolve_valid', 1)) {
        await this.cacheManager.del(CAPTCHA_CACHE_PREFIX + `${scene}:${email}`);
      }
      return true;
    }
    throw new BadRequestException('验证码校验失败,请检查后重试');
  }

  /**
   * 邮件发送
   * @param {ISendMailOptions} sendMailOptions
   */
  async commSendEmail(sendMailOptions: ISendMailOptions) {
    try {
      this.logger.log(sendMailOptions, 'sendMailOptions');
      const sentInfo = await this.mailerService.sendMail(sendMailOptions);
      // 设置发送标识
      const frequencyTtl = this.configService.get<number>(
        'captcha.frequency_ttl',
        60,
      );
      await this.cacheManager.set(
        CAPTCHA_CACHE_PREFIX + `frequency:${sendMailOptions.to}`,
        dayjs().add(frequencyTtl, 'second').format(DATE_FORMAT),
        frequencyTtl * 1e3,
      );
      return sentInfo;
    } catch (error) {
      Logger.error(error, 'commSendEmail');
      return error;
    }
  }
}
