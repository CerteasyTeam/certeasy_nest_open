import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
// service
import { WatchService } from '../watch.service';
import { AppException } from '@app/common';

@Injectable()
export class MissedWatchesJobService {
  private readonly logger = new Logger(MissedWatchesJobService.name);

  constructor(
    @Inject(CACHE_MANAGER)
    private cacheManager: Cache,
    private readonly watchService: WatchService,
  ) {}

  /**
   *   ┌──────────── [可选] 秒 (0 - 59)
   *   | ┌────────── 分钟 (0 - 59)
   *   | | ┌──────── 小时 (0 - 23)
   *   | | | ┌────── 天数 (1 - 31)
   *   | | | | ┌──── 月份 (1 - 12) OR jan,feb,mar,apr ...
   *   | | | | | ┌── 星期几 (0 - 6, 星期天 = 0) OR sun,mon ...
   *   | | | | | |
   *   * * * * * * 命令
   */
  // */10 * * * * 每10分钟检查监控是否遗忘
  @Cron('*/10 * * * *')
  async handleMissedWatchesCron() {
    this.logger.debug(
      '================== 每10分钟检查监控是否遗忘 =====================',
    );
    // 获取到点监控超出10分钟的数据
    const watches: any[] = await this.watchService.getTheMissedWatches();
    this.logger.debug('missed watches', watches);
    // 循环处理
    for (const watch of watches) {
      console.log('watch', watch);
      try {
        // 执行数据写入和推送队列
        await this.watchService.renewRecord({ id: watch.userId }, watch, {
          watchCertificateId: watch?.watchCertificateId,
        });
      } catch (err) {
        this.logger.error('renew-watch-create err:', err.message);
        throw new AppException(err.message);
      }
    }
    this.logger.debug('================== ending =====================');
    return watches;
  }
}
