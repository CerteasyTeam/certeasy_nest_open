import { IDnsProvider, QueryRecordParams, RecordData } from '../provider';
import { BadRequestException, Logger } from '@nestjs/common';
import { CommonClient } from 'tencentcloud-sdk-nodejs-common';
export class QCloudDnsProvider extends IDnsProvider {
  // logger
  readonly logger = new Logger(QCloudDnsProvider.name);
  private client: any;
  private runtime: any;
  constructor(secretId, secretKey) {
    super(secretId, secretKey);
    console.log('secretId, secretKey', secretId, secretKey);
    // 初始化客户端
    this.client = new CommonClient('dnspod.tencentcloudapi.com', '2021-03-23', {
      credential: {
        secretId,
        secretKey,
      },
      region: '',
      profile: {
        httpProfile: {
          endpoint: 'dnspod.tencentcloudapi.com',
        },
      },
    });
  }

  /**
   * 设置dns记录
   * @param domain
   * @param record
   */
  async setRecord(domain: string, record: RecordData) {
    const params = {
      Domain: domain,
      RecordType: record.type,
      RecordLine: '默认',
      Value: record.value,
      SubDomain: record.RR,
    };
    const { RecordId, RequestId } = await this.clientRequest(
      'CreateRecord',
      params,
    );
    if (RecordId && RequestId) {
      return {
        recordId: RecordId,
      };
    }
    throw new Error('qcloud dns set error: request failed');
  }

  /**
   * 更新DNS
   * @param domain
   * @param record
   */
  async updateRecord(domain, record: RecordData) {
    const params = {
      Domain: domain,
      SubDomain: record.RR,
      RecordType: record.type,
      RecordLine: '默认',
      Value: record.value,
      RecordId: record.recordId,
    };
    console.log('params', params);
    return await this.clientRequest('ModifyRecord', params);
  }

  async queryRecord(queryParams: QueryRecordParams) {
    const params = {
      Domain: queryParams.domain,
      SubDomain: queryParams.keyWords,
    };
    console.log('params', params);
    return await this.clientRequest('DescribeRecordFilterList', params);
  }

  /**
   * 删除dns记录
   * @param domain
   * @param queryParams
   */
  async deleteRecord(domain: string, queryParams: RecordData) {
    const params = {
      Domain: domain,
      RecordId: queryParams.recordId,
    };
    console.log('params', params);
    return await this.clientRequest('DeleteRecord', params);
  }

  async checkDomainDnsRecord(domain, record?: RecordData) {
    const { RequestId, RecordList } = await this.queryRecord({
      domain,
      keyWords: record.RR,
    });
    if (RequestId && RecordList?.length) {
      return (RecordList as any).map((item) => {
        return {
          recordId: item.RecordId,
          RR: item.Name,
          type: item.Type,
          domainName: domain,
        };
      });
    }
    return [];
  }

  /**
   * 检查dns是否正常授权
   */
  async checkDns() {
    // 腾讯这个就读取域名列表吧 DescribeDomainList
    return await this.clientRequest('DescribeDomainList', {
      Offset: 0,
      Limit: 1,
    });
  }

  /**
   * 统一请求
   * @param clientServiceRequestFunc
   * @param serviceRequest
   * @private
   */
  private async clientRequest(
    clientServiceRequestFunc: string,
    serviceRequest: any,
  ) {
    try {
      return await this.client.request(
        clientServiceRequestFunc,
        serviceRequest,
      );
    } catch (error) {
      // 错误 message
      this.logger.error(error.message);
      throw new BadRequestException(error.message);
    }
  }
}
