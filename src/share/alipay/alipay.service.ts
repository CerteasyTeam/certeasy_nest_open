import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AlipayCURLOptions, AlipaySdk } from 'alipay-sdk';

@Injectable()
export class AlipayService {
  private readonly logger = new Logger(AlipayService.name);
  private readonly alipaySdk: AlipaySdk;

  constructor(private readonly configService: ConfigService) {
    // 初始化AlipaySdk
    this.alipaySdk = new AlipaySdk({
      appId: configService.get<string>('alipay.appid'),
      gateway: configService.get<string>('alipay.gateway'),
      signType: configService.get<'RSA' | 'RSA2'>('alipay.sign_type'),
      privateKey: configService.get<string>('alipay.private_key'),
      alipayPublicKey: configService.get<string>('alipay.pub_key'),
    });
  }

  /**
   * curl
   */
  async curl(httpMethod: any = 'POST', path: string, data: AlipayCURLOptions) {
    return await this.alipaySdk.curl(httpMethod, path, {
      body: { ...data },
    });
  }

  /**
   * 电脑网站支付
   * @param bizContent
   */
  async buildPaymentForm(bizContent: any) {
    const notifyUrl = this.configService.get<string>('alipay.notify_url');
    const returnUrl = this.configService.get<string>('alipay.return_url');
    this.logger.debug('bizContent', bizContent);
    // 电脑网站跳转支付
    return this.alipaySdk.pageExecute('alipay.trade.page.pay', 'GET', {
      bizContent,
      notifyUrl,
      returnUrl,
    });
  }

  /**
   * 扫码支付
   * @param bizContent
   */
  async buildPaymentQrCode(bizContent: any) {
    const notifyUrl = this.configService.get<string>('alipay.notify_url');
    const returnUrl = this.configService.get<string>('alipay.return_url');
    this.logger.debug('bizContent', bizContent);
    return await this.alipaySdk.exec('alipay.trade.precreate', {
      bizContent: {
        product_code: 'FACE_TO_FACE_PAYMENT',
        ...bizContent,
      },
      notifyUrl,
      returnUrl,
    });
  }

  /**
   * 订单查询
   * @param bizContent
   */
  async queryPaymentResult(bizContent: any) {
    return await this.alipaySdk.exec('alipay.trade.query', {
      bizContent,
    });
  }

  /**
   * 支付签名校验
   * @param params
   */
  async verifySignature(params: any) {
    try {
      return this.alipaySdk.checkNotifySign(params);
    } catch (err) {
      this.logger.error('verify signature err:' + err.message);
      return false;
    }
  }
}
