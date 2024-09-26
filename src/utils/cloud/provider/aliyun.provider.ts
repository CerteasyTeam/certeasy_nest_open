import { BadRequestException, HttpStatus, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { randomNum } from '@app/utils';
// @alicloud
import * as $OpenApi from '@alicloud/openapi-client';
import Cas20200407, * as $Cas20200407 from '@alicloud/cas20200407';
import Cdn20180510, * as $Cdn20180510 from '@alicloud/cdn20180510';
import DCdn20180115, * as $DCdn20180115 from '@alicloud/dcdn20180115';
import * as $Util from '@alicloud/tea-util';

interface AliConfig {
  accessKeyId: string;
  accessKeySecret: string;
  domain?: string;
}
interface AliDeployOptions {
  name: string;
  cert?: string;
  key?: string;
  encryptCert?: string;
  encryptPrivateKey?: string;
  signCert?: string;
  signPrivateKey?: string;
  resourceGroupId?: string;
}

export class AliyunProvider {
  // logger
  readonly logger = new Logger(AliyunProvider.name);
  private httpService: HttpService = new HttpService();

  // 配置数据
  private config: AliConfig;
  private client: any;
  private runtime: any;
  private certName: any;

  constructor(config: AliConfig) {
    // 配置信息
    this.config = config;
  }

  /**
   * 前置检查 - 查找域名存在
   * @param productName
   */
  async preCheck(productName: string) {
    if (productName === 'CDN') {
      // 查询是否启用cdn
      const { body, statusCode } = await this.checkCDNStatus();
      if (
        statusCode == HttpStatus.OK &&
        body?.internetChargeType &&
        body?.instanceId
      ) {
        const { body, statusCode } = await this.checkCDNDomain(
          this.config.domain,
        );
        // CDN域名存在且状态正常
        if (
          statusCode === HttpStatus.OK &&
          body?.getDomainDetailModel?.domainStatus == 'online'
        ) {
          if (body?.getDomainDetailModel?.domainStatus != 'online') {
            throw new BadRequestException(
              'CDN域名状态异常，请检查域名是否正常',
            );
          }
          return true;
        }
      }
      throw new BadRequestException(
        '配置数据错误，请检查输入是否正确或检查是否授权CDN权限',
      );
    } else if (productName === 'DCDN') {
      const { body, statusCode } = await this.clientRequest(
        'dcdn.aliyuncs.com',
        'describeDcdnDomainDetailWithOptions',
        new $DCdn20180115.DescribeDcdnDomainDetailRequest({
          domainName: this.config.domain,
        }),
      );
      this.logger.debug('data', statusCode, JSON.stringify(body));
      return statusCode == HttpStatus.OK;
    } else {
      // 获取客户端并请求检查证书信息
      const { body, statusCode } = await this.clientRequest(
        'cas.aliyuncs.com',
        'listCertWarehouseWithOptions',
        new $Cas20200407.ListCertWarehouseRequest({}),
      );
      this.logger.debug('data', JSON.stringify(body));
      return statusCode == HttpStatus.OK;
    }
  }

  /**
   * 部署入口
   * @param productName
   * @param options
   */
  async deploy(productName: string, options: AliDeployOptions) {
    if (productName === 'CDN') {
      // 上传证书并设置cdn关联证书
      // 1. 上传证书
      const CertId = await this.deploy('SSL', {
        ...options,
      });
      console.log('CertId', CertId);
      // 2.关联证书 直接绑定到cas证书id
      await this.setCdnDomainSSLCertificate({
        domainName: this.config?.domain,
        SSLProtocol: 'on',
        certId: CertId,
        certType: 'cas', // 'cas' | 'upload'
        certName: this.certName || `${options?.name}-${randomNum(100, 999)}`,
        // SSLPub: options.cert,
        // SSLPri: options.key,
      });
      return this.config?.domain;
    } else if (productName === 'DCDN') {
      // 1. 上传证书
      const CertId = await this.deploy('SSL', {
        ...options,
      });
      console.log('CertId', CertId);
      // 2.关联证书 直接绑定到cas证书id
      await this.setDCdnDomainSSLCertificate({
        domainName: this.config?.domain,
        SSLProtocol: 'on',
        certId: CertId,
        certType: 'cas', // 'cas' | 'upload'
        certName: this.certName || `${options?.name}-${randomNum(100, 999)}`,
        // SSLPub: options.cert,
        // SSLPri: options.key,
      });
      return this.config?.domain;
    } else {
      // set certName
      this.certName = `${options?.name}-${randomNum(100, 999)}`;
      // 上传证书
      const { body, statusCode } = await this.uploadSSLCertificate({
        ...options,
        name: this.certName || `${options?.name}-${randomNum(100, 999)}`,
      });
      // 确认上传成功
      if (statusCode == HttpStatus.OK) {
        this.logger.debug('data', JSON.stringify(body));
        return body.certId;
      }
      return false;
    }
  }

  /**
   * 部署检查
   */
  async verify(productName: string, certId?: string) {
    if (productName === 'CDN') {
      const { body, statusCode } = await this.clientRequest(
        'cdn.aliyuncs.com',
        'describeDomainCertificateInfoWithOptions',
        new $Cdn20180510.DescribeDomainCertificateInfoRequest({
          domainName: certId,
        }),
      );
      this.logger.debug('verify.data', JSON.stringify(body?.certInfos));
      return (
        statusCode === HttpStatus.OK &&
        body?.certInfos?.certInfo.some(
          (item: any) => item.certId && item.serverCertificateStatus === 'on',
        )
      );
    } else if (productName === 'DCDN') {
      const { body, statusCode } = await this.clientRequest(
        'dcdn.aliyuncs.com',
        'describeDcdnDomainCertificateInfoWithOptions',
        new $DCdn20180115.DescribeDcdnDomainCertificateInfoRequest({
          domainName: certId,
        }),
      );
      this.logger.debug('verify.data', JSON.stringify(body?.certInfos));
      return (
        statusCode === HttpStatus.OK &&
        body?.certInfos?.certInfo.some(
          (item: any) => item.certId && item.SSLProtocol === 'on',
        )
      );
    } else {
      const { body, statusCode } = await this.clientRequest(
        'cas.aliyuncs.com',
        'getUserCertificateDetailWithOptions',
        new $Cas20200407.GetUserCertificateDetailRequest({
          certId,
        }),
      );
      if (statusCode == HttpStatus.OK) {
        this.logger.debug('verify.data', JSON.stringify(body));
        return body.id;
      }
      return false;
    }
  }

  /**
   * 构建客户端
   */
  createClient(endpoint: string, config?: any) {
    config = new $OpenApi.Config({
      endpoint, // Endpoint 请参考 https://api.aliyun.com/product/cas
      accessKeyId: this.config.accessKeyId || config.accessKeyId,
      accessKeySecret: this.config.accessKeySecret || config.accessKeySecret,
    });
    // client
    if (endpoint === 'cdn.aliyuncs.com') {
      this.client = new Cdn20180510(config);
    } else if (endpoint === 'dcdn.aliyuncs.com') {
      this.client = new DCdn20180115(config);
    } else {
      this.client = new Cas20200407(config);
    }
    // runtime
    this.runtime = new $Util.RuntimeOptions({});
    return {
      client: this.client,
      runtime: this.runtime,
    };
  }

  /**
   * 统一请求
   * @param endpoint
   * @param clientServiceRequestFunc
   * @param serviceRequest
   * @private
   */
  private async clientRequest(
    endpoint: string,
    clientServiceRequestFunc: string,
    serviceRequest: any,
  ) {
    const { client, runtime } = this.createClient(endpoint);
    try {
      // 复制代码运行请自行打印 API 的返回值
      return await client[clientServiceRequestFunc](serviceRequest, runtime);
    } catch (error) {
      // 错误 message
      this.logger.error(error.message);
      // 诊断地址
      this.logger.debug(error.data['Recommend']);
      throw new BadRequestException(error.message);
    }
  }

  /**
   * 检查cdn是否开启
   * @private
   */
  private async checkCDNStatus() {
    return await this.clientRequest(
      'cdn.aliyuncs.com',
      'describeCdnServiceWithOptions',
      new $Cdn20180510.DescribeCdnServiceRequest({}),
    );
  }

  /**
   * 检查dns域名存在
   * @param domainName
   * @private
   */
  private async checkCDNDomain(domainName: string) {
    return await this.clientRequest(
      'cdn.aliyuncs.com',
      'describeCdnDomainDetailWithOptions',
      new $Cdn20180510.DescribeCdnDomainDetailRequest({ domainName }),
    );
  }

  /**
   * 上传ssl证书
   * @param options
   * @private
   */
  private async uploadSSLCertificate(options: any) {
    return await this.clientRequest(
      'cas.aliyuncs.com',
      'uploadUserCertificateWithOptions',
      new $Cas20200407.UploadUserCertificateRequest({ ...options }),
    );
  }

  /**
   * 上传ssl证书
   * @param options
   * @private
   */
  private async setCdnDomainSSLCertificate(options: any) {
    return await this.clientRequest(
      'cdn.aliyuncs.com',
      'setCdnDomainSSLCertificateWithOptions',
      new $Cdn20180510.SetCdnDomainSSLCertificateRequest({ ...options }),
    );
  }
  /**
   * 设置DCDN域名证书
   * @param options
   * @private
   */
  private async setDCdnDomainSSLCertificate(options: any) {
    return await this.clientRequest(
      'dcdn.aliyuncs.com',
      'setDcdnDomainSSLCertificateWithOptions',
      new $DCdn20180115.SetDcdnDomainSSLCertificateRequest({ ...options }),
    );
  }
}
