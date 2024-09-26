import { InjectQueue, OnQueueFailed, Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job, Queue } from 'bull';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
// services
import { WatchService } from '../watch.service';
import { NotificationService } from '@app/modules/notification/notification.service';
// dtos
// utils
import {
  asleep,
  convertCertificateToPem,
  loadDomainCertificate,
  retryFuncWithDelay,
} from '@app/utils';
import * as dayjs from 'dayjs';
import { getCertStatus, getCertStatusByDomain } from 'easy-ocsp';
import { AppException, DATE_FORMAT } from '@app/common';

@Processor('watch')
export class WatchProcessor {
  private readonly logger = new Logger(WatchProcessor.name);
  private error: string = '';
  constructor(
    @InjectQueue('watch')
    private watchQueue: Queue,
    private readonly notificationService: NotificationService,
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    private readonly watchService: WatchService,
  ) {}

  /**
   * 更新错误信息
   * @param watch
   * @param watchRecord
   */
  async updateCertificateJobInError(watch, watchRecord) {
    try {
      await this.watchService.updateWatchById(watch.id, {
        status: 0,
      });
      await this.watchService.updateWatchRecordById(watchRecord.id, {
        ocspStatus: '',
        error: this.error || '',
        status: 0, //  0 错误 1 进行中(默认) 2 监听中
      });
    } catch (err) {
      this.logger.error('watch-close err:', err.message);
    }
  }

  @Process('watch-close')
  async handleClose(job: Job) {
    const { watch, watchRecord } = job.data;
    // 自动关单独处理
    await this.updateCertificateJobInError(watch, watchRecord);
  }

  @OnQueueFailed()
  async handleQueueFailed(job: Job) {
    const attemptsMade = job.attemptsMade;
    const maxAttempts = job.opts.attempts;
    if (attemptsMade === maxAttempts) {
      const { watch, watchRecord } = job.data;
      console.log('This was the last attempt, and it failed.');
      await this.updateCertificateJobInError(watch, watchRecord);
      // 删除job
      await job.remove();
    }
    this.logger.debug('===========   handleQueueFailed  end  ===========');
  }

  /**
   * 重设延时任务
   * @param closeJobId
   */
  async clearWatchCloseJob(closeJobId: number | string) {
    const job = await this.watchQueue.getJob(closeJobId);
    if (job) {
      await job.remove();
    }
  }

  @Process('watch-create')
  async handleCreate(job: Job) {
    const { user, watch, watchRecord, closeJobId } = job.data;
    try {
      // asleep 停止1s 后开始
      await asleep(1e3);
      const certificateInfo: PeerCertificate = await retryFuncWithDelay(
        async () => {
          // 加载证书
          return await loadDomainCertificate(
            watch.domain,
            { port: watch.port || 443 },
            true,
          );
        },
        10,
        2e3,
      );
      // 检查ocsp状态
      let ocspStatus = 'UNKNOWN';
      let revokedTime: string | null = null;
      try {
        const { status, revocationTime } =
          (await getCertStatus(certificateInfo.raw)) ||
          (await getCertStatusByDomain(watch.domain));
        ocspStatus = status.toUpperCase();
        revokedTime = revocationTime
          ? dayjs(revocationTime).format('YYYY-MM-DD HH:mm:ss')
          : null;
      } catch (e) {
        this.logger.error('ocspStatus err: ' + e.message);
        this.error = e.message;
      }
      // 日期处理
      const validFrom = dayjs(certificateInfo.valid_from).format(
        'YYYY-MM-DD HH:mm:ss',
      );
      const validTo = dayjs(certificateInfo.valid_to).format(
        'YYYY-MM-DD HH:mm:ss',
      );
      // 如果ocspStatus !== GOOD
      if (ocspStatus !== 'GOOD') {
        // 下发通知
        await this.notificationService.triggerNotification(user, 3, {
          certificates: [
            {
              domains: [watch.domain],
              expiredTime: revokedTime || validTo,
            },
          ],
        });
      }
      // 写入证书信息
      const watchCertificate =
        await this.watchService.createOrUpdateWatchCertificate({
          ...certificateInfo,
          pubkey: convertCertificateToPem(certificateInfo.pubkey),
          validFrom,
          validTo,
          certificateInPem: convertCertificateToPem(certificateInfo.raw),
          issuerCertificateInPem: convertCertificateToPem(
            certificateInfo.issuerCertificate?.raw,
          ),
          revokedTime,
        });
      await this.watchService.updateWatchRecordById(watchRecord.id, {
        watchCertificateId: watchCertificate.id,
        retryTimes: Number(watchRecord.retryTimes || 0) + 1,
        ocspStatus,
        status: 2, //  0 错误 1 进行中(默认) 2 监听中
      });
      // 计算两个日期之间的天数
      const diffDays = dayjs(certificateInfo.valid_to).diff(dayjs(), 'day');
      // 更新监听信息 - 记录最新记录
      await this.watchService.updateWatchById(watch.id, {
        latestRecordId: watchRecord.id,
        status: diffDays <= 0 ? 0 : 1, // 如果过期了设置0
      });
      // 执行正常 - 取消自动关单
      await this.clearWatchCloseJob(closeJobId);
      // 加入下一次检测队列
      const now = dayjs(); // 当前时间
      const tomorrowSameTime = now.add(1, 'day'); // 明天此时
      const diffInSeconds = tomorrowSameTime.diff(now, 'millisecond'); // 获取时间差，以秒为单位
      this.logger.debug(
        'watch-create process will run at the next time node :' +
          tomorrowSameTime.format(DATE_FORMAT),
      );
      // 下次继续
      await this.watchQueue.add(
        'watch-next',
        {
          user,
          watch,
          watchRecord,
        },
        {
          delay:
            this.configService.get<string>('app.env', 'development') ===
            'development'
              ? 600e3
              : diffInSeconds,
          attempts: 3,
          removeOnComplete: true,
          removeOnFail: true,
        },
      );
    } catch (err) {
      this.error = err.message;
      this.logger.error('watch-create err:', err.message);
      // 下发通知
      await this.notificationService.triggerNotification(user, 3, {
        certificates: [
          {
            id: watch.id,
            domains: [watch.domain],
            expiredTime: '--',
          },
        ],
      });
      throw new AppException(err.message);
    }
  }

  @Process('watch-next')
  async handleNextJob(job: Job) {
    const { user, watch, watchRecord } = job.data;
    try {
      // 执行数据写入和推送队列
      await this.watchService.renewRecord(user, watch, watchRecord);
    } catch (err) {
      this.error = err.message;
      this.logger.error('renew-watch-create err:', err.message);
      throw new AppException(err.message);
    }
  }
}
