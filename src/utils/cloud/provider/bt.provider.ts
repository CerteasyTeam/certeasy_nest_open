import { BadRequestException, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import * as https from 'https';
import * as qs from 'qs';
import { cryptoMd5 } from '@app/utils';
import { BT_PROJECT_TYPE } from '@app/common';

interface BtConfig {
  panel: string;
  token: string;
  siteName?: string;
  projectType?: string;
}
interface BtDeployOptions {
  type?: number;
  siteName?: string;
  key: string;
  cert: string;
}

export class BtProvider {
  // logger
  readonly logger = new Logger(BtProvider.name);
  private httpService: HttpService = new HttpService();

  // 配置数据
  private config: BtConfig;

  constructor(config: BtConfig) {
    this.config = config;
    // 构建请求数据和签名处理
    // api_sk = 接口密钥 (在面板设置页面 - API 接口中获取)
    // request_time = 当前请求时间的 uinx 时间戳 ( php: time() / python: time.time() )
    // request_token = md5(string(request_time) + md5(api_sk))
    // PHP 示例： $request_token = md5($request_time . ‘’ . md5($api_sk))
  }

  /**
   * 前置检查 - 查找域名存在
   * @param productName
   */
  async preCheck(productName: string) {
    // 面板SSL
    if (productName === 'PANEL') {
      // config?action=GetPanelSSL
      const data = await this.post('/config?action=GetPanelSSL');
      this.logger.debug('preCheck.GetPanelSSL', data?.info);
      if (data?.status == false) {
        throw new BadRequestException(data?.msg || '面板配置数据不存在');
      }
      return true;
    } else {
      // 获取域名数据看看是否存在
      const data = await this.post('/data?action=getData', {
        table: 'sites',
        type: -1,
        search: this.config?.siteName,
      });
      if (data.data?.length) {
        const hasDomain = data.data?.some(
          (domain: any) => domain.name === this.config?.siteName,
        );
        this.logger.debug('preCheck.domain =>' + JSON.stringify(hasDomain));
        if (hasDomain) return true;
        throw new BadRequestException('网站配置数据不存在');
      }
      throw new BadRequestException(data?.msg || '网站配置数据不存在');
    }
  }

  /**
   * 部署入口
   * @param productName
   * @param options
   */
  async deploy(productName: string, options: BtDeployOptions) {
    if (productName === 'PANEL') {
      // /config?action=SavePanelSSL
      const params = {
        privateKey: options.key,
        certPem: options.cert,
      };
      this.logger.debug('deploy params:', params);
      // 构建请求数据
      await this.post('/config?action=SavePanelSSL', params);
      // 返回bt hostname https://47.76.170.139:13034/config
      const { hostname } = new URL(this.config?.panel);
      return hostname || this.config.siteName;
    } else {
      // 构建请求数据
      const data = await this.post('/site?action=SetSSL', {
        key: options.key,
        csr: options.cert,
        type: options.type || BT_PROJECT_TYPE[this.config.projectType],
        siteName: options.siteName || this.config.siteName,
      });
      console.log('deploy.data', data);
      // 返回siteName 供verify 查询
      if (data && data.status) return options.siteName || this.config.siteName;
      throw new BadRequestException(data?.msg || '部署失败，未知错误');
    }
  }

  /**
   * 部署检查
   */
  async verify(productName: string, siteName?: string) {
    if (productName === 'PANEL') {
      const data = await this.post('/config?action=GetPanelSSL');
      this.logger.debug('verify.data', data?.info);
      return data && data?.info.subject === siteName;
    } else {
      const data = await this.post('/site?action=GetSSL', {
        siteName: siteName || this.config.siteName,
      });
      console.log('verify.data', data, data && data.status);
      return data && data.status;
    }
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
  private async request(method: 'GET' | 'POST', url: string, data?: any) {
    // 签名数据
    const sign = this.getSignData();
    // 忽略 ssl
    const httpsAgent = new https.Agent({ rejectUnauthorized: false });
    const reqConfig = {
      baseURL: this.config.panel,
      url,
      method,
      httpsAgent,
    };
    // 请求方式参数
    if (method === 'GET') {
      reqConfig['params'] = { ...sign, ...data };
    } else {
      reqConfig['data'] = qs.stringify({ ...sign, ...data });
    }
    // console.log('request.data', reqConfig['params'] || reqConfig['data']);
    this.logger.debug('deploy reqConfig:', reqConfig);
    try {
      const response = await this.httpService.request(reqConfig).toPromise();
      // 请求正常
      if (response && response?.status == 200) {
        return response.data;
      }
      this.logger.error('response', response);
      new Error('provider request failed.');
    } catch (err) {
      this.logger.error('request.err:', err.message);
      throw new BadRequestException('provider request failed.');
    }
  }

  /**
   * 构建签名数据
   */
  getSignData() {
    const request_time = Date.now();
    const request_token = cryptoMd5(
      request_time + cryptoMd5(this.config?.token),
    );
    return {
      request_time,
      request_token,
    };
  }
}
