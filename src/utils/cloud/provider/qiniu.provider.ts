import { BadRequestException, HttpStatus, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
// qiniu
import * as qiniu from 'qiniu';
import * as qs from 'qs';
// @app
import { hmacSha1, base64ToUrlSafe, readCertificateInfo } from '@app/utils';

interface QiniuConfig {
  accessKey: string;
  secretKey: string;
  domain?: string;
}

interface QiniuDeployOptions {
  name: string;
  common_name: string;
  pri: string;
  ca: string;
}

export class QiniuProvider {
  // logger
  readonly logger = new Logger(QiniuProvider.name);
  private httpService: HttpService = new HttpService();

  // 配置数据
  private config: QiniuConfig;
  private mac: any;
  private runtime: any;

  constructor(config: QiniuConfig) {
    console.log('config', config);
    this.config = config;
    this.mac = new qiniu.auth.digest.Mac(config.accessKey, config.secretKey);
  }

  /**
   * 前置检查 - 查找域名存在
   * @param productName
   */
  async preCheck(productName: string) {
    if (productName === 'CDN') {
      try {
        const data = await this.get(
          `/domain/${this.config.domain}`, //'/domain?types=&certId&sourceTypes=&sourceQiniuBucket=&sourceIp=&marker=&limit=10',
          {},
          {
            ContentType: 'application/x-www-form-urlencoded',
          },
        );
        // console.log('data', data);
        return data?.name;
      } catch (err) {
        throw new BadRequestException(
          `域名【${this.config.domain}】在七牛云CDN中无法找到，请在七牛云CDN中新增配置后重试`,
        );
      }
    } else {
      const data = await this.getSslCert();
      console.log('data', data.code);
      return data && data.code === 0;
    }
  }

  /**
   * 获取域名证书
   */
  async getSslCert() {
    // /sslcert?marker=<Marker>&limit=<Limit>
    return await this.get(
      '/sslcert?market=&limit=1',
      {},
      {
        ContentType: 'application/x-www-form-urlencoded',
      },
    );
  }

  /**
   * 上传域名证书
   */
  async postSslCert(data: QiniuDeployOptions) {
    return await this.post('/sslcert', data, {
      ContentType: 'application/json',
    });
  }

  /**
   * 设置域名证书
   */
  async updateDomainCert(uri: string, certId: string) {
    const params = {
      forceHttps: false,
      http2Enable: false,
    };
    // https://developer.qiniu.com/fusion/4246/the-domain-name#12
    // 这里七牛云的参数名不一样，有点恶心
    params[uri === 'sslize' ? 'certid' : 'certId'] = certId;
    await this.put(
      `/domain/${this.config.domain}/${uri}`, //'/domain?types=&certId&sourceTypes=&sourceQiniuBucket=&sourceIp=&marker=&limit=10',
      params,
      {
        ContentType: 'application/json',
      },
    );
    this.logger.debug(`/domain/<Name>/${uri} response ok`);
  }

  /**
   * 部署入口
   * @param productName
   * @param options
   */
  async deploy(productName: string, options: any) {
    if (productName === 'CDN') {
      // 1.获取CDN域名信息
      const { protocol, https } = await this.get(
        `/domain/${this.config.domain}`, //'/domain?types=&certId&sourceTypes=&sourceQiniuBucket=&sourceIp=&marker=&limit=10',
        {},
        {
          ContentType: 'application/x-www-form-urlencoded',
        },
      );
      // 上传部署cdn证书
      const certId = await this.deploy('SSL', {
        name: options.name,
        key: options.key,
        cert: options.cert,
      });
      console.log('certId', certId);
      // 存在https配置就更新证书
      if (protocol === 'https' && https?.certId != '') {
        //  /domain/<Name>/httpsconf
        await this.updateDomainCert('httpsconf', certId);
      } else {
        // HTTP升级为HTTPS  /domain/<Name>/sslize
        await this.updateDomainCert('sslize', certId);
      }
      this.logger.debug('update domain ssl certid:' + certId);
      return certId;
    } else {
      // 读取证书
      const { subject } = readCertificateInfo(options.cert);
      this.logger.debug('deploy.subject', subject);
      // 构建请求数据
      const data = await this.postSslCert({
        name: options.name,
        common_name: subject.CN || '',
        pri: options.key,
        ca: options.cert,
      });
      console.log('deploy.data', data);
      if (data && data.code === HttpStatus.OK && data.certID)
        return data.certID;
      throw new BadRequestException(data?.error || '部署失败，未知错误');
    }
  }

  /**
   * 部署检查
   */
  async verify(productName: string, certId?: string) {
    if (productName === 'CDN') {
      const data = await this.get(
        `/domain/${this.config.domain}`, //'/domain?types=&certId&sourceTypes=&sourceQiniuBucket=&sourceIp=&marker=&limit=10',
        {},
        {
          ContentType: 'application/x-www-form-urlencoded',
        },
      );
      // protocol == https && operationType == sslize && operatingState == && https.certId == certId
      console.log('verify.data', data);
      return (
        data.protocol == 'https' &&
        ['sslize', 'modify_https_conf'].includes(data.operationType) &&
        data.operatingState == 'success' &&
        data?.https?.certId == certId
      );
    } else {
      const data = await this.get(`/sslcert/${certId}`);
      console.log('verify.data', data.cert);
      return data && data.cert && data.code === HttpStatus.OK;
    }
  }

  /**
   * get 方法
   * @param uri
   * @param params
   * @param options
   */
  private async get(uri: string, params?: any, options?: any) {
    return await this.request('GET', uri, { params, ...options });
  }

  /**
   * post 方法
   * @param uri
   * @param data
   * @param options
   */
  private async post(uri: string, data?: any, options?: any) {
    return await this.request('POST', uri, { data, ...options });
  }

  /**
   * put 方法
   * @param uri
   * @param data
   * @param options
   */
  private async put(uri: string, data?: any, options?: any) {
    return await this.request('PUT', uri, { data, ...options });
  }

  /**
   * 请求方法
   * @param method
   * @param url
   * @param config
   */
  private async request(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    url: string,
    config?: any,
  ) {
    // 注意： 当 Content-Type 为 application/x-www-form-urlencoded 时，签名内容必须包括请求内容。
    let reqBody = '';
    if (
      config?.header?.ContentType &&
      config.header.ContentType.includes('x-www-form-urlencoded')
    ) {
      reqBody = config.data ? qs.stringify(config.data) : '';
    }
    const QBoxToken = this.generateAccessToken(this.mac, url, reqBody);
    try {
      this.logger.debug('QBoxToken', QBoxToken);
      const reqConfig = {
        baseURL: 'https://api.qiniu.com',
        url,
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `${QBoxToken}`,
        },
        ...config,
      };
      this.logger.debug('reqConfig', reqConfig);
      const response = await this.httpService.request(reqConfig).toPromise();
      // 请求正常
      if (response && response?.status == 200) {
        return response.data;
      }
      new Error('provider request failed.');
    } catch (err) {
      if (err.response && err.response.status == HttpStatus.UNAUTHORIZED) {
        throw new BadRequestException(
          '接口签名校验错误，请检查你的SK/SK是否正确',
        );
      }
      this.logger.error('request.err:', err.message);
      throw new BadRequestException('provider request failed.');
    }
  }

  /**
   * 构建QBox 签名
   * @param mac
   * @param path
   * @param reqBody
   */
  generateAccessToken(mac: any, path: string, reqBody: string) {
    let access = path + '\n';

    if (reqBody) {
      access += reqBody;
    }
    console.log('access', access);
    const digest = hmacSha1(access, mac.secretKey);
    const safeDigest = base64ToUrlSafe(digest);
    return 'QBox ' + mac.accessKey + ':' + safeDigest;
  }
}
