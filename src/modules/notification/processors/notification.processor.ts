import { InjectQueue, OnQueueFailed, Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job, Queue } from 'bull';
// services
import { NotificationService } from '../notification.service';
// utils

/**
 * 1	证书即将到期通知
 * 2	证书更新结果通知
 * 3	证书监控异常通知
 * 4	余额不足通知
 * 5	云资源部署结果通知
 * 6	金币充值结果通知
 */
import { AppException } from '@app/common';

@Processor('notification')
export class NotificationProcessor {
  private readonly logger = new Logger(NotificationProcessor.name);
  private error: string = '';
  constructor(
    @InjectQueue('notification')
    private notificationQueue: Queue,
    private readonly notificationService: NotificationService,
  ) {}

  @Process('notification-send')
  async handleSend(job: Job) {
    const { user, notification, channel, template, content } = job.data;
    this.logger.log('notification-send start');
    try {
      // todo 消息发送三要素 渠道，接收者，内容
      const { providerId, accessJson } = channel;
      await this.notificationService.notificationToChannel(providerId, {
        user,
        notification,
        template,
        content,
        accessJson,
      });
    } catch (err) {
      this.error = err.message;
      this.logger.error('notification-send err:', err.message);
      throw new AppException(err.message);
    }
  }
}
