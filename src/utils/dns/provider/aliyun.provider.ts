import { IDnsProvider, QueryRecordParams, RecordData } from '../provider';
// @alicloud
import * as $OpenApi from '@alicloud/openapi-client';
import Alidns20150109, * as $Alidns20150109 from '@alicloud/alidns20150109';
import * as $Util from '@alicloud/tea-util';
import { HttpStatus, Logger } from '@nestjs/common';
import { extractDomainWithPrefix } from '@app/utils';
export class AliDnsProvider extends IDnsProvider {
  // logger
  readonly logger = new Logger(AliDnsProvider.name);
  private client: any;
  private runtime: any;
  constructor(accessKey, accessSecret) {
    super(accessKey, accessSecret);
    // 初始化阿里云 SDK 或其他必要的设置
    const config = new $OpenApi.Config({
      endpoint: 'alidns.cn-shenzhen.aliyuncs.com',
      accessKeyId: accessKey,
      accessKeySecret: accessSecret,
    });
    this.client = new Alidns20150109(config);
    this.runtime = new $Util.RuntimeOptions({});
  }

  async setRecord(domain: string, record: RecordData) {
    // 实现具体的阿里云 DNS 记录设置逻辑
    const addDomainRecordRequest = new $Alidns20150109.AddDomainRecordRequest({
      domainName: domain,
      RR: record.RR,
      type: record.type,
      value: record.value,
    });
    try {
      // 复制代码运行请自行打印 API 的返回值
      const { statusCode, body } = await this.client.addDomainRecordWithOptions(
        addDomainRecordRequest,
        this.runtime,
      );
      if (statusCode === HttpStatus.OK && body?.recordId) {
        return body;
      }
      throw new Error('aliyun dns set error: ' + statusCode);
    } catch (error) {
      // 错误 message
      this.logger.error(error.message);
      // 诊断地址
      this.logger.debug(error.data['Recommend']);
      throw new Error(error.message);
    }
  }

  async updateRecord(domain, record: RecordData) {
    // 实现具体的阿里云 DNS 记录更新逻辑
    const updateDomainRecordRequest =
      new $Alidns20150109.UpdateDomainRecordRequest({
        recordId: record.recordId,
        RR: record.RR,
        type: record.type,
        value: record.value,
      });
    try {
      // 复制代码运行请自行打印 API 的返回值
      return await this.client.updateDomainRecordWithOptions(
        updateDomainRecordRequest,
        this.runtime,
      );
    } catch (error) {
      // 错误 message
      this.logger.error(error.message);
      // 诊断地址
      this.logger.debug(error.data['Recommend']);
      throw new Error(error.message);
    }
  }

  async queryRecord(queryParams: QueryRecordParams) {
    // 实现具体的阿里云 DNS 记录查询逻辑
    const describeDomainRecordsRequest =
      new $Alidns20150109.DescribeDomainRecordsRequest({
        domainName: queryParams.domain,
        RRKeyWord: queryParams.keyWords,
      });
    try {
      // 复制代码运行请自行打印 API 的返回值
      return await this.client.describeDomainRecordsWithOptions(
        describeDomainRecordsRequest,
        this.runtime,
      );
    } catch (error) {
      // 错误 message
      this.logger.error(error.message);
      // 诊断地址
      this.logger.debug(error.data['Recommend']);
      throw new Error(error.message);
    }
  }

  /**
   * 删除dns记录
   * @param domain
   * @param queryParams
   */
  async deleteRecord(domain, queryParams: RecordData) {
    const deleteSubDomainRecordsRequest =
      new $Alidns20150109.DeleteSubDomainRecordsRequest({
        recordId: queryParams.recordId,
        domainName: domain,
        RR: queryParams.RR,
        type: queryParams.type,
      });
    try {
      // 复制代码运行请自行打印 API 的返回值
      return await this.client.deleteSubDomainRecordsWithOptions(
        deleteSubDomainRecordsRequest,
        this.runtime,
      );
    } catch (error) {
      // 此处仅做打印展示，请谨慎对待异常处理，在工程项目中切勿直接忽略异常。
      // 错误 message
      console.log(error.message);
      // 诊断地址
      console.log(error.data['Recommend']);
      throw new Error(error.message);
    }
  }

  /**
   * 校验dns
   */
  async checkDns() {
    try {
      // aliyun就查询dns列表吧
      return await this.client.describeDomainsWithOptions(
        new $Alidns20150109.DescribeDomainsRequest({
          pageNumber: 1,
          pageSize: 1,
        }),
        this.runtime,
      );
    } catch (error) {
      // 此处仅做打印展示，请谨慎对待异常处理，在工程项目中切勿直接忽略异常。
      // 错误 message
      console.log(error.message);
      // 诊断地址
      console.log(error.data['Recommend']);
      throw new Error(error.message);
    }
  }
  /**
   * 检查
   */
  async checkDomainDnsRecord(domain, record?: RecordData) {
    // 检查用户的cname 有没有 _acme-challenge 配置
    const {
      body: { domainRecords },
      statusCode,
    } = await this.queryRecord({
      domain: domain,
      keyWords: record.RR,
    });

    if (statusCode == HttpStatus.OK && domainRecords?.record?.length) {
      // 检查是否残留
      return (domainRecords!.record as any).map((item: any) => {
        return {
          recordId: item.recordId,
          RR: item.RR,
          type: item.type,
          domainName: item.domainName,
        };
      });
    }
    return [];
  }
}
