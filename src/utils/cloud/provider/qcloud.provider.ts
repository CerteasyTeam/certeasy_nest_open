import { BadRequestException, Logger } from '@nestjs/common';

import { CommonClient } from 'tencentcloud-sdk-nodejs-common';
import { randomNum } from '@app/utils';

interface QCloudConfig {
  secretId: string;
  secretKey: string;
  domain?: string;
}

interface QCloudDeployOptions {
  name: string;
  cert?: string;
  key?: string;
}

export class QCloudProvider {
  // logger
  readonly logger = new Logger(QCloudProvider.name); // 配置数据
  private config: QCloudConfig;
  private client;

  constructor(config: QCloudConfig) {
    // 配置信息
    this.config = config;
  }
  /**
   * 前置检查
   * @param productName
   */
  async preCheck(productName: string) {
    if (productName === 'CDN') {
      const data = await this.clientRequest(
        'cdn.tencentcloudapi.com',
        'DescribeDomains',
        {
          Filters: [
            {
              Name: 'domain',
              Value: [this.config?.domain],
            },
          ],
        },
      );
      this.logger.debug('data', JSON.stringify(data));
      if (data && data?.TotalNumber <= 0) {
        throw new BadRequestException(
          '找不到CDN域名信息，请确认您在CDN控制台以及完成验证创建CDN域名信息',
        );
      }
      return data && data?.TotalNumber > 0;
    } else {
      const data = await this.clientRequest(
        'ssl.tencentcloudapi.com',
        'DescribeCertificates',
        {
          Offset: 0,
          Limit: 1,
        },
      );
      this.logger.debug('data', JSON.stringify(data));
      return true;
    }
  }
  /**
   * 部署
   * @param productName
   * @param options
   */
  async deploy(productName: string, options: QCloudDeployOptions) {
    if (productName === 'CDN') {
      // 1.上传证书
      const CertificateId = await this.deploy('SSL', options);
      if (CertificateId) {
        // 2.更新CDN配置信息并开启https
        // UpdateDomainConfig
        await this.clientRequest(
          'cdn.tencentcloudapi.com',
          'UpdateDomainConfig',
          {
            Domain: this.config.domain,
            Https: {
              Switch: 'on', // on 启用 off 关闭
              CertInfo: {
                CertId: CertificateId,
              },
            },
            HttpsBilling: {
              Switch: 'on',
            },
          },
        );
      }
      return this.config?.domain;
    } else {
      // 上传证书
      const data = await this.clientRequest(
        'ssl.tencentcloudapi.com',
        'UploadCertificate',
        {
          CertificatePublicKey: options.cert,
          CertificatePrivateKey: options.key,
          CertificateType: 'SVR',
          Alias: `${options?.name}-${randomNum(100, 999)}`,
          Repeatable: true,
        },
      );
      console.log('UploadCertificate.data', data);
      if (data && data?.CertificateId) {
        return data?.RepeatCertId || data.CertificateId;
      }
      return false;
    }
  }
  /**
   * 部署检查
   */
  async verify(productName: string, target: any) {
    if (productName === 'CDN') {
      // 检查是否部署完成
      const { Domains, TotalNumber } = await this.clientRequest(
        'cdn.tencentcloudapi.com',
        'DescribeDomainsConfig',
        {
          Offset: 0,
          Limit: 1,
          Filters: [
            {
              Name: 'domain',
              Value: [target],
            },
          ],
        },
      );
      return (
        TotalNumber > 0 &&
        Domains.some(
          (domain: any) =>
            domain.Status === 'online' && domain.Https.CertInfo.CertId,
        )
      );
    } else {
      // 验证证书id是否查询到
      const { CertificateId } = await this.clientRequest(
        'ssl.tencentcloudapi.com',
        'DescribeCertificateDetail',
        {
          CertificateId: target,
        },
      );
      return CertificateId === target;
    }
  }

  /**
   * 构建客户端
   */
  createClient(endpoint: string, config?: any) {
    config = {
      credential: {
        secretId: this.config.secretId,
        secretKey: this.config.secretKey,
      },
      region: '',
      profile: {
        httpProfile: {
          endpoint,
        },
      },
    };
    // client
    if (endpoint === 'cdn.tencentcloudapi.com') {
      this.client = new CommonClient(endpoint, '2018-06-06', config);
    } else {
      this.client = new CommonClient(endpoint, '2019-12-05', config);
    }
    // return
    return this.client;
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
    const client = this.createClient(endpoint);
    try {
      return await client.request(clientServiceRequestFunc, serviceRequest);
    } catch (error) {
      // 错误 message
      this.logger.error(error.message);
      throw new BadRequestException(error.message);
    }
  }
}
