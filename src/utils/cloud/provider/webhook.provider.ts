import { BadRequestException, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import * as https from 'https';
import * as qs from 'qs';
import { cryptoMd5 } from '@app/utils';
import * as dayjs from 'dayjs';

interface WebhookConfig {
  url: string;
  token: string;
}

export class WebhookProvider {
  // logger
  readonly logger = new Logger(WebhookProvider.name);
  private httpService: HttpService = new HttpService();

  // 配置数据
  private config: WebhookConfig;

  constructor(config: any) {
    this.config = config;
  }

  /**
   * 前置检查 - 检查连通性
   * @param productName
   */
  async preCheck(productName: string) {
    const result = await this.get('/', {});
    console.log('productName: result', productName, result);
    if (result == 'success') return true;
    throw new BadRequestException(
      'Webhook请求响应错误，请检查webhook链接是否正常访问！',
    );
  }

  /**
   * 部署入口
   * @param productName
   * @param options
   */
  async deploy(productName: string, options: any) {
    await this.post('/', {
      fullchain: options.cert,
      key: options.key,
    });
    return productName;
  }

  /**
   * 部署检查 - 直接成功
   */
  async verify(productName: string, siteName?: string) {
    return true;
  }

  /**
   * get 方法
   * @param uri
   * @param params
   */
  private async get(uri: string, params?: any) {
    return await this.request('GET', uri, params);
  }

  /**
   * post 方法
   * @param uri
   * @param data
   */
  private async post(uri: string, data?: any) {
    return await this.request('POST', uri, data);
  }

  /**
   * 请求方法
   * @param method
   * @param url
   * @param data
   */
  private async request(
    method: 'GET' | 'POST' = 'GET',
    url: string,
    data?: any,
  ) {
    // 签名数据
    const sign = this.getSignData();
    // 忽略 ssl
    const httpsAgent = new https.Agent({ rejectUnauthorized: false });
    const reqConfig = {
      baseURL: this.config.url,
      url,
      method,
      httpsAgent,
    };
    // 请求方式参数
    if (method === 'GET') {
      reqConfig['params'] = { ...sign, payload: data };
    } else {
      reqConfig['data'] = qs.stringify({ ...sign, payload: data });
    }
    //this.logger.debug('deploy reqConfig:', reqConfig);
    try {
      const response = await this.httpService.request(reqConfig).toPromise();
      // 请求正常
      if (response && response?.status == 200) {
        return response.data;
      }
      this.logger.error('response', response);
      new Error('response status failed: ' + (response?.status || 502));
    } catch (err) {
      this.logger.error('request.err:', err.message);
      throw new BadRequestException('provider request failed:' + err.message);
    }
  }

  /**
   * 构建签名数据
   */
  getSignData() {
    const timestamp = dayjs().unix();
    const sign = cryptoMd5(timestamp + cryptoMd5(this.config?.token));
    return {
      timestamp,
      sign,
    };
  }
}
