import { AliDnsProvider } from './provider/aliyun.provider';
import { QCloudDnsProvider } from './provider/qcloud.provider';

export class DnsProviderFactory {
  /**
   * Create a DNS provider instance based on the given provider type
   * @param providerType
   * @param accessKey
   * @param accessSecret
   */
  static createProvider(
    providerType: string,
    accessKey: string,
    accessSecret: string,
  ) {
    switch (providerType) {
      case 'aliyun':
        return new AliDnsProvider(accessKey, accessSecret);
      case 'dnspod':
      case 'qcloud':
        return new QCloudDnsProvider(accessKey, accessSecret);
      default:
        throw new Error('Unknown provider type');
    }
  }
}
