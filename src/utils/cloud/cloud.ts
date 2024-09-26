import { AliyunProvider } from './provider/aliyun.provider';
import { BtProvider } from './provider/bt.provider';
import { QCloudProvider } from './provider/qcloud.provider';
import { QiniuProvider } from './provider/qiniu.provider';
import { WebhookProvider } from './provider/webhook.provider';

export class CloudFactory {
  static createProvider(providerType: string, config: any) {
    switch (providerType) {
      case 'aliyun':
        return new AliyunProvider(config);
      case 'bt':
        return new BtProvider(config);
      case 'qcloud':
        return new QCloudProvider(config);
      case 'qiniu':
        return new QiniuProvider(config);
      case 'webhook':
        return new WebhookProvider(config);
      default:
        throw new Error('Unknown provider type');
    }
  }
}
