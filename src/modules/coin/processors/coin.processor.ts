import { InjectQueue, Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job, Queue } from 'bull';
import { ConfigService } from '@nestjs/config';
// services
import { CoinService } from '../coin.service';
@Processor('coin')
export class CoinProcessor {
  private readonly logger = new Logger(CoinProcessor.name);
  constructor(
    @InjectQueue('coin')
    private coinQueue: Queue,
    private readonly configService: ConfigService,
    private readonly coinService: CoinService,
  ) {}
  @Process('coin-close')
  async handleCreate(job: Job) {
    const { transaction } = job.data;
    try {
      // 关闭订单
      await this.coinService.updateCoinTransactionStatus(transaction.id, -1);
    } catch (err) {
      this.logger.error('coin-close err:', err.message);
    }
  }
}
