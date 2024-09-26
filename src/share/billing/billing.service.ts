import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import * as path from 'path';
import * as fs from 'fs';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
// user/user.service
import { UserService } from '@app/modules/user/user.service';
import { UserCoinTransactionType } from '@app/modules/user/enums';
import { NotificationService } from '@app/modules/notification/notification.service';
import { AppException, NOTIFICATION_CACHE_PREFIX } from '@app/common';

// 配置路径
const CONFIG_PATH = path.resolve(
  path.dirname(__dirname),
  'billing',
  'config.json',
);

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);
  private config: any[];
  private billingName: string;
  constructor(
    @Inject(CACHE_MANAGER)
    private cacheManager: Cache,
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
    private readonly notificationService: NotificationService,
    private readonly userService: UserService,
  ) {
    // 计费规则读取
    this.loadConfig();
    this.watchConfigFile();
  }

  private loadConfig() {
    const configData = fs.readFileSync(CONFIG_PATH, 'utf-8');
    this.config = JSON.parse(configData);
  }

  getConfig() {
    return this.config;
  }

  /**
   * 监听文件变化重载
   * @private
   */
  private watchConfigFile() {
    fs.watchFile(CONFIG_PATH, () => {
      this.logger.log('Billing config file updated, reloading...');
      this.loadConfig();
    });
  }

  getBillingRules(typeName: string) {
    const type = this.config.find((t) => t.name === typeName);
    return type ? type.rules : null;
  }

  getBillingMethods(typeName: string, ruleName: string) {
    const type = this.config.find((t) => t.name === typeName);
    if (!type) return null;
    this.logger.debug('billing type: ' + type.description);
    const rule = type.rules.find((r) => r.name === ruleName);
    this.logger.debug('billing rule: ' + rule.description);
    // 设置消费名称
    this.billingName = `${type.description}-${rule.description}`;
    this.logger.debug('billing name: ' + this.billingName);
    return rule ? rule.methods : null;
  }

  /**
   * 扣费前置检查
   * @param user
   */
  async preCheckUserCoin(user: IUserPayload) {
    // 用户资金
    const userCoin = await this.userService.userCoin(user);
    if (userCoin.coin <= 0) {
      throw new AppException('用户余额不足，请及时充值');
    }
  }

  /**
   * 计费
   */
  async triggerBilling(
    userId: number,
    typeName: string,
    ruleName: string,
    methodName: string,
  ) {
    const methods = this.getBillingMethods(typeName, ruleName);
    if (!methods) {
      throw new Error('Invalid type or rule name');
    }

    const method = methods.find((m) => m.name === methodName.toLowerCase());
    if (!method) {
      throw new Error('Invalid billing method');
    }
    // 补充name
    this.billingName += `（${method.description}）`;
    const fee = this.calculateFee(method.config);
    // Trigger the fee deduction logic (e.g., update user balance)
    this.logger.debug('deductFee: ' + fee);
    // 异步执行
    this.deductFee(userId, fee).then(() => {});

    return { fee, message: 'Billing successfully triggered' };
  }

  /**
   * 消费计算
   * @param config
   * @private
   */
  private calculateFee(config: any): number {
    return config.price;
  }

  /**
   * 执行金币扣减
   * @param userId
   * @param fee
   * @private
   */
  private async deductFee(userId: number, fee: number) {
    // 前置检查
    await this.preCheckUserCoin({ id: userId });
    // startTransaction
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const user = await this.userService.userInfo({
        id: userId,
      });
      // 用户资金
      const userCoin = await this.userService.userCoinWithTransaction(
        queryRunner,
        {
          id: userId,
        },
      );
      // 检查用户余额是否要提示了
      await this.checkUserCoinNotification(user, userCoin);
      this.logger.debug(`userCoin info => ${JSON.stringify(userCoin)}`);
      // 扣减用户金币余额
      await this.userService.userCoinTransaction(
        queryRunner,
        userCoin,
        -fee,
        UserCoinTransactionType.DECREASE,
        `${this.billingName}， 消耗${fee}金币`,
      );
      this.logger.log('update user coin transaction done');
      // commitTransaction
      await queryRunner.commitTransaction();
    } catch (err) {
      // rollbackTransaction
      await queryRunner.rollbackTransaction();
      this.logger.error('pay callback err:' + err.message);
    } finally {
      // 释放
      await queryRunner.release();
    }
  }

  /**
   * 处理用户消费金额通知
   * @param user
   * @param userCoin
   * @private
   */
  private async checkUserCoinNotification(user: any, userCoin: any) {
    const lastThreshold = await this.cacheManager.get(
      NOTIFICATION_CACHE_PREFIX + `threshold:${user.email}`,
    );
    // 如果限制了就先不发
    if (lastThreshold) return;

    // 阈值通知
    const thresholds = [1000, 500, 100, 50, 10, 0];
    const lastThresholdValue = lastThreshold
      ? parseInt(lastThreshold as string, 10)
      : 0;

    for (const threshold of thresholds) {
      if (userCoin.coin <= threshold && lastThresholdValue > threshold) {
        // 下发通知
        await this.notificationService.triggerNotification(user, 4, {
          coin: userCoin.coin,
        });
        await this.cacheManager.set(
          NOTIFICATION_CACHE_PREFIX + `lock:${user.email}`,
          threshold,
          15 * 60e3, // 15分钟再发
        );
        break;
      }
    }
    return;
  }
}
