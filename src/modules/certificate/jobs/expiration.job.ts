import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import * as dayjs from 'dayjs';
import { CERTIFICATE_CACHE_PREFIX } from '@app/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
// service
import { UserService } from '@app/modules/user/user.service';
import { NotificationService } from '@app/modules/notification/notification.service';
import { CertificateService } from '../certificate.service';

@Injectable()
export class ExpirationJobService {
  private readonly logger = new Logger(ExpirationJobService.name);

  constructor(
    @Inject(CACHE_MANAGER)
    private cacheManager: Cache,
    private readonly certificateService: CertificateService,
    private readonly userService: UserService,
    private readonly notificationService: NotificationService,
  ) {}
  // 计算证书剩余天数
  private getDaysLeft(expiredDate: string): number {
    const today = dayjs();
    const timeDiff = dayjs(expiredDate);
    return Math.ceil(timeDiff.diff(today, 'day', true));
  }

  /**
   * 检查 Redis 中是否需要发送通知
   * @param cert
   * @param daysLeft
   * @private
   */
  private async shouldNotify(cert: any, daysLeft: number): Promise<boolean> {
    // 不自动通知
    if (!cert?.autoNotify) return false;
    // redisKey
    const redisKey = `${CERTIFICATE_CACHE_PREFIX}${cert?.id}:lastNotifiedDays`;

    // 获取上一次通知的天数
    const lastNotifiedDays = await this.cacheManager.get<string>(redisKey);
    const nextNotifyDay = lastNotifiedDays
      ? parseInt(lastNotifiedDays, 10) / 2
      : cert?.notifyDaysInAdvance;

    // 如果到期天数小于或等于需要通知的天数，并且没有重复发送通知
    return (
      daysLeft <= nextNotifyDay &&
      (!lastNotifiedDays || parseInt(lastNotifiedDays, 10) !== daysLeft)
    );
  }

  // 更新 Redis 中的通知状态
  private async updateLastNotifiedDays(id: number, daysLeft: number) {
    const redisKey = `${CERTIFICATE_CACHE_PREFIX}${id}:lastNotifiedDays`;

    // 设置 Redis 键值
    await this.cacheManager.set(
      redisKey,
      daysLeft.toString(),
      360 * 18640 * 1e3,
    );
  }

  /**
   * 是否开始更新
   * @param cert
   * @param daysLeft
   * @private
   */
  private async shouldUpdate(cert: any, daysLeft: number) {
    // 不自动更新
    if (!cert?.autoUpdate) return false;
    // redisKey
    const redisKey = `${CERTIFICATE_CACHE_PREFIX}${cert?.id}:lastUpdatedDays`;

    // 获取上一次更新的天数
    const lastUpdatedDays = await this.cacheManager.get<string>(redisKey);
    const nextUpdateDay = lastUpdatedDays
      ? parseInt(lastUpdatedDays, 10) / 2
      : cert?.updateDaysInAdvance;

    // 如果到期天数小于或等于需要通知的天数，并且没有重复发送通知
    return (
      daysLeft <= nextUpdateDay &&
      (!lastUpdatedDays || parseInt(lastUpdatedDays, 10) !== daysLeft)
    );
  }

  // 更新 Redis 中的更新状态
  private async updateLastUpdatedDays(id: number, daysLeft: number) {
    const redisKey = `${CERTIFICATE_CACHE_PREFIX}${id}:lastUpdatedDays`;

    // 设置 Redis 键值
    await this.cacheManager.set(
      redisKey,
      daysLeft.toString(),
      360 * 18640 * 1e3,
    );
  }

  /**
   * 发送即将过期消息
   * @param userId
   * @param certificates
   * @private
   */
  private async sendExpirationNotification(
    userId: number,
    certificates: any[],
  ) {
    // 获取用户信息
    const user = await this.userService.userInfo({ id: userId });
    this.logger.debug(
      'sendExpirationNotification user => ' + JSON.stringify(user),
    );
    await this.notificationService.triggerNotification(user, 1, {
      certificates: certificates.map((item: any) => {
        return {
          ...item,
          domains: item?.domains ? JSON.parse(item?.domains) : [],
        };
      }),
    });
  }
  // 按用户分组证书
  private groupCertificatesByUser(certificates: any) {
    return certificates.reduce((acc: any, certificate: any) => {
      const { userId } = certificate;
      if (!acc[userId]) {
        acc[userId] = [];
      }
      acc[userId].push(certificate);
      return acc;
    }, {});
  }

  // 0 30 9 * * * 每日9.30检查证书
  @Cron('0 30 9 * * *')
  async handleCertificateExpirationCron() {
    this.logger.debug(
      '================== 每日9.30检查证书到期情况 =====================',
    );
    // 获取30天内的证书，最早30天开始提醒（用户可设置最大30天， 默认15）
    // 最早第15天开始更新（用户可设置最大天， 默认 7）
    const certificates =
      await this.certificateService.getCertificatesExpiringSoon();
    this.logger.debug('expiring soon certificates', certificates);
    // const userCertificates = this.groupCertificatesByUser(certificates);
    const userCertificates = [];
    // 根据过期时间发送不同的通知
    for (const cert of certificates) {
      const daysLeft = this.getDaysLeft(cert.expiredTime);
      // 是否需要发送消息
      if (await this.shouldNotify(cert, daysLeft)) {
        // 记录到发送数据内
        if (
          userCertificates[cert?.userId] &&
          userCertificates[cert?.userId].length
        ) {
          userCertificates[cert?.userId].push(cert);
        } else {
          userCertificates[cert?.userId] = [cert];
        }
        // 更新 Redis 中的 lastNotifiedDays
        await this.updateLastNotifiedDays(cert.id, daysLeft);
      }
      // 是否需要更新证书
      if (await this.shouldUpdate(cert, daysLeft)) {
        // 直接发送到更新队列里
        await this.certificateService.createVersion(
          { id: cert?.userId },
          cert.id,
          'automatic',
        );
        await this.updateLastUpdatedDays(cert.id, daysLeft);
      }
    }
    // 这里应该按用户划分，要批量给用户发
    if (userCertificates?.length) {
      for (const [userId, certs] of Object.entries(userCertificates)) {
        await this.sendExpirationNotification(parseInt(userId), certs);
      }
    }
    this.logger.debug('deal-with certificates', userCertificates);
    this.logger.debug('================== ending =====================');
    return userCertificates;
  }
}
