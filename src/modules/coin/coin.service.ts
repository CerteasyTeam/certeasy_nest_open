import {
  Injectable,
  Inject,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import * as dayjs from 'dayjs';
import { plainToInstance } from 'class-transformer';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
// @app/utils
import { genSnId } from '@app/utils';
// @app/common
import {
  CAPTCHA_CACHE_PREFIX,
  DATE_FORMAT,
  GLOBAL_CACHE_PREFIX,
} from '@app/common';
// @app/modules/services
import { UserService } from '@app/modules/user/user.service';
import { AlipayService } from '@app/share/alipay/alipay.service';
import { NotificationService } from '@app/modules/notification/notification.service';
import { UserCoinTransactionType } from '@app/modules/user/enums';
// entities
import { CoinEntity, CoinTransactionEntity } from './entities';
import { AlipayNotifyDto, CreateOrderDto } from './dtos';

@Injectable()
export class CoinService {
  // logger
  readonly logger = new Logger(CoinService.name);

  constructor(
    private readonly dataSource: DataSource,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    @InjectQueue('coin')
    private coinQueue: Queue,
    private readonly configService: ConfigService,
    private readonly userService: UserService,
    private notificationService: NotificationService,
    private readonly alipayService: AlipayService,
    @InjectRepository(CoinEntity)
    private readonly coinRepository: Repository<CoinEntity>,
    @InjectRepository(CoinTransactionEntity)
    private readonly coinTransactionRepository: Repository<CoinTransactionEntity>,
  ) {}

  /**
   * 金币销售配置
   */
  async pods() {
    const [records, total] = await this.coinRepository.findAndCount({
      where: {
        status: 1,
      },
    });
    return {
      total,
      records,
    };
  }
  /**
   * 获取订单信息
   * @param user
   * @param id
   */
  async orderInfo(user: IUserPayload, id: number) {
    const info = await this.coinTransactionRepository.findOneBy({
      userId: user.id,
      id,
    });
    if (!info) throw new BadRequestException('订单数据不存在');
    // 如果没支付，保证支付宝回调先查询
    if (info?.status != 1) {
      const result = await this.alipayService.queryPaymentResult({
        out_trade_no: info.outTradeNo,
      });
      if (
        result &&
        result?.code == '10000' &&
        result?.tradeStatus == 'TRADE_SUCCESS' &&
        result?.outTradeNo == info.outTradeNo
      ) {
        // 更新状态
        info.status = 1;
        // 使用异步操作更新
        await this.paySuccessUpdateCoin(result);
      }
    }
    return {
      orderId: info.id,
      outTradeNo: info.outTradeNo,
      isPaid: info.status === 1,
      paidTime: info.paidTime,
    };
  }

  /**
   * 更新状态
   * @param id
   * @param status
   */
  async updateCoinTransactionStatus(id: number, status: number = -1) {
    const coinTransaction = await this.coinTransactionRepository.findOneBy({
      id,
    });
    if (!coinTransaction) throw new BadRequestException('订单数据不存在');
    if (coinTransaction && coinTransaction.status === 0) {
      coinTransaction.status = status;
      return await this.coinTransactionRepository.save(coinTransaction);
    }
    throw new BadRequestException('订单已支付或已取消，无需操作');
  }

  /**
   * 下单支付
   * @param user
   * @param data
   */
  async placeOrder(user: IUserPayload, data: CreateOrderDto) {
    // 产品
    const podInfo = await this.coinRepository.findOneBy({
      id: data.podId,
    });
    if (!podInfo) throw new BadRequestException('产品信息不存在');
    // 1.创建订单信息
    try {
      const outTradeNo = genSnId(user.id);
      const subject = `CERTEASY ${podInfo.name}`;
      const body = `${podInfo.name} * 1`;
      const coinTransactionRepo = this.coinTransactionRepository.create({
        userId: user.id,
        coinId: podInfo.id,
        outTradeNo,
        subject,
        body,
        price: podInfo.price,
        coin: podInfo.coin,
        amount: podInfo.price,
      });
      const coinTransaction =
        await this.coinTransactionRepository.save(coinTransactionRepo);
      // 30分钟 超时关单
      const jobDelay = dayjs().add(30, 'minute').valueOf() - dayjs().valueOf();
      const coinCloseJob = await this.coinQueue.add(
        'coin-close',
        {
          user,
          transaction: coinTransaction,
        },
        {
          delay: jobDelay,
          attempts: 3,
          removeOnComplete: true,
          removeOnFail: true,
        },
      );
      // 写入缓存
      await this.cacheManager.set(
        GLOBAL_CACHE_PREFIX + `order:${outTradeNo}`,
        coinCloseJob.id,
        jobDelay,
      );
      // TODO 目前直接使用个人商户的扫码付，返回的时候二维码链接，仅支持手机扫码
      const result = await this.alipayService.buildPaymentQrCode({
        outTradeNo: coinTransaction.outTradeNo,
        totalAmount: coinTransaction.amount,
        body: coinTransaction.body,
        subject: coinTransaction.subject,
        product_code: 'FACE_TO_FACE_PAYMENT',
        goods_detail: [
          {
            goods_id: podInfo.id,
            goods_name: podInfo.name,
            quantity: 1,
            price: podInfo.price,
            goods_category: '1',
            body: podInfo.name,
          },
        ],
      });
      if (
        result &&
        result?.code == '10000' &&
        result?.outTradeNo == coinTransaction.outTradeNo
      ) {
        return {
          orderId: coinTransaction.id,
          qrCode: result?.qrCode,
        };
      }
      throw new Error('支付接口异常，请稍后再试！');
      /* 2.构建支付链接
      const redirectUrl = await this.alipayService.buildPaymentForm({
        outTradeNo: coinTransaction.outTradeNo,
        totalAmount: coinTransaction.amount,
        body: coinTransaction.body,
        subject: coinTransaction.subject,
        product_code: 'FAST_INSTANT_TRADE_PAY',
        // qr_pay_mode: '0',
        goods_detail: [
          {
            goods_id: podInfo.id,
            goods_name: podInfo.name,
            quantity: 1,
            price: podInfo.price,
            goods_category: '1',
            body: podInfo.name,
          },
        ],
      });
      return {
        orderId: coinTransaction.id,
        redirectUrl,
      };*/
    } catch (err) {
      this.logger.error('create coin transaction err:' + err.message);
      throw new BadRequestException('创建信息错误，请稍后再试');
    }
  }

  /**
   * 支付回调校验和处理
   * @param provider
   * @param data
   */
  async payCallback(provider: string, data: any) {
    const signVerify = await this.alipayService.verifySignature(data);
    if (signVerify) {
      // 转换dto
      const tradeResult = plainToInstance(AlipayNotifyDto, data, {
        excludeExtraneousValues: true,
      });
      await this.paySuccessUpdateCoin(tradeResult);
    } else {
      this.logger.error('pay callback sign verify failed.');
    }
    return 'success';
  }

  /**
   * paySuccessUpdateCoin
   * @param data
   */
  async paySuccessUpdateCoin({ outTradeNo, tradeStatus }: any) {
    this.logger.debug('outTradeNo =>' + outTradeNo);
    this.logger.debug('tradeStatus =>' + tradeStatus);
    // 查找并更新
    const coinTransaction = await this.coinTransactionRepository.findOneBy({
      outTradeNo,
    });
    // 存在并且待支付 状态 -1 关闭 0 待支付 1 已支付
    if (coinTransaction && coinTransaction.status === 0) {
      // startTransaction
      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();
      try {
        this.logger.log('update coin transaction');
        this.logger.debug(
          'coinTransaction => ' + JSON.stringify(coinTransaction),
        );
        // 更新状态和支付时间
        coinTransaction.status = 1;
        coinTransaction.paidTime = dayjs().toDate();
        await queryRunner.manager.save(coinTransaction);
        this.logger.log('update coin transaction done');
        // TODO 下发金币
        const userCoin = await this.userService.userCoinWithTransaction(
          queryRunner,
          {
            id: coinTransaction.userId,
          },
        );
        this.logger.debug(`userCoin info => ${JSON.stringify(userCoin)}`);
        await this.userService.userCoinTransaction(
          queryRunner,
          userCoin,
          coinTransaction.coin,
          UserCoinTransactionType.INCREASE,
          `金币充值${coinTransaction.coin}金币`,
        );
        this.logger.log('update user coin transaction done');
        // commitTransaction
        await queryRunner.commitTransaction();
        // 下发消息通知 type 6
        const user = await this.userService.userInfo({
          id: coinTransaction.userId,
        });
        await this.notificationService.triggerNotification(user, 6, {
          coin: userCoin.coin,
        });
        // TODO 查找上级，分发充值奖励
        await this.userService.rewardCoinToParent(user, coinTransaction.coin);
        // 移除closeJob
        const jobId = await this.cacheManager.get<string>(
          GLOBAL_CACHE_PREFIX + `order:${outTradeNo}`,
        );
        const job = await this.coinQueue.getJob(jobId);
        if (job) {
          await job.remove();
          await this.cacheManager.del(
            GLOBAL_CACHE_PREFIX + `order:${outTradeNo}`,
          );
        } else {
          this.logger.log('coinCloseJob not found, operation ignored.');
        }
      } catch (err) {
        // rollbackTransaction
        await queryRunner.rollbackTransaction();
        this.logger.error('pay callback err:' + err.message);
      } finally {
        // 释放
        await queryRunner.release();
      }
    }
  }
}
