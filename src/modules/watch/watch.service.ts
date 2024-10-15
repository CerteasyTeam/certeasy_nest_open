import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, DataSource, In, Repository } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { plainToInstance } from 'class-transformer';
import * as _ from 'lodash';
import * as dayjs from 'dayjs';
import * as psl from 'psl';
// @app/common
import { DATE_FORMAT } from '@app/common';
// entities
import {
  WatchCertificateEntity,
  WatchEntity,
  WatchRecordEntity,
} from './entities';
// dtos
import {
  CreateWatchIDto,
  QueryWatchDto,
  UpdateWatchIDto,
  WatchCertificateInfoDto,
  WatchInfoDto,
  WatchRecordInfoDto,
} from './dtos';
// billing module
import { BillingService } from '@app/share';

@Injectable()
export class WatchService {
  // logger
  readonly logger = new Logger(WatchService.name);
  constructor(
    private readonly dataSource: DataSource,
    private readonly billingService: BillingService,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
    @InjectQueue('watch')
    private watchQueue: Queue,
    @InjectRepository(WatchEntity)
    private readonly watchRepository: Repository<WatchEntity>,
    @InjectRepository(WatchRecordEntity)
    private readonly watchRecordRepository: Repository<WatchRecordEntity>,
    @InjectRepository(WatchCertificateEntity)
    private readonly watchCertificateRepository: Repository<WatchCertificateEntity>,
  ) {}

  /**
   * 总览
   * @param user
   */
  async loadOverview(user: IUserPayload) {
    const where = { userId: user.id };
    const userWatchIds = await this.watchRepository
      .find({ select: ['id'], where })
      .then((watch) => watch.map((result) => result.id));
    // 关联证书
    const userWatchCertificateIds = await this.watchRecordRepository
      .find({
        select: ['watchCertificateId'],
        where: { watchId: In(userWatchIds) },
      })
      .then((record) => record.map((result) => result.watchCertificateId));
    return {
      totalCount: Math.abs(userWatchIds.length),
      willExpiredCount: await this.watchCertificateRepository.countBy({
        id: In(_.uniq(userWatchCertificateIds)),
        validTo: Between(
          dayjs().startOf('day').format(DATE_FORMAT),
          dayjs().add(15, 'day').endOf('day').format(DATE_FORMAT),
        ),
      }),
      successCount: await this.watchRecordRepository.count({
        where: { watchId: In(userWatchIds), status: In([1, 2]) },
      }),
      errorCount: await this.watchRecordRepository.count({
        where: { watchId: In(userWatchIds), status: 0 },
      }),
    };
  }

  /**
   * 监控数据列表
   * @param user
   * @param query
   */
  async list(user: IUserPayload, query: QueryWatchDto) {
    // 提取参数
    const {
      keyword,
      pageNum = 1,
      pageSize = 10,
      sortBy = 'createTime',
      sortOrder = 'DESC',
    } = query;
    // createQueryBuilder
    const queryBuilder = this.watchRepository
      .createQueryBuilder('w')
      .leftJoinAndSelect('w.latestRecord', 'wr')
      .leftJoinAndSelect('wr.certificate', 'wc')
      .where('w.user_id = :userId', { userId: user.id })
      .loadRelationCountAndMap('w.recordsCount', 'w.watchRecords')
      .select('w')
      .addSelect([
        'wr.status as w_latestRecordStatus',
        'wr.updateTime as w_latestRecordTime',
        'wc.issuer as w_issuer',
        'wc.validTo as w_expiredTime',
        'wc.revokedTime as w_revokedTime',
      ]);
    // 关键词筛选
    if (keyword) {
      queryBuilder.andWhere(`w.name LIKE :keyword or w.alias LIKE :keyword`, {
        keyword: `%${keyword}%`,
      });
    }
    // 排序筛选
    if (sortBy && sortOrder) {
      queryBuilder.addOrderBy(`w.${sortBy}`, sortOrder);
    }
    const [list, total] = await queryBuilder
      .offset((pageNum - 1) * pageSize)
      .limit(pageSize)
      .groupBy('w.id')
      .getManyAndCount();
    return {
      total,
      records: list,
    };
  }

  /**
   * 新增监听信息
   * @param user
   * @param data
   */
  async create(user: IUserPayload, data: CreateWatchIDto) {
    // 存在性监控
    const info = await this.watchRepository.findOneBy({
      userId: user.id,
      domain: data.domain,
      port: data.port,
    });
    if (info) {
      throw new BadRequestException('存在相同监控数据');
    }
    // todo 域名可行性
    if (!psl.isValid(data.domain)) {
      throw new BadRequestException(
        `域名【${data.domain}】不是合法域名,请检查输入`,
      );
    }
    // 扣费前置检查
    await this.billingService.preCheckUserCoin(user);
    // TODO startTransaction
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      // 创建监听
      const watchRepo = this.watchRepository.create({
        userId: user.id,
        domain: data.domain,
        port: data.port,
      });
      const watch = await queryRunner.manager.save(watchRepo);
      this.logger.debug('watch completed:' + JSON.stringify(watch));
      // 创建记录
      const watchRecordRepo = this.watchRecordRepository.create({
        watchId: watch.id,
      });
      const watchRecord = await queryRunner.manager.save(watchRecordRepo);
      this.logger.debug('watchRecord completed:' + JSON.stringify(watchRecord));
      // 最后watchRecord
      watch.latestRecordId = watchRecord.id;
      await queryRunner.manager.save(watch);
      // TODO 证书获取队列
      await this.pushWatchQueue(user, watch, watchRecord);
      // commitTransaction
      await queryRunner.commitTransaction();
      return watch;
    } catch (err) {
      // rollbackTransaction
      await queryRunner.rollbackTransaction();
      this.logger.error('create watch err:' + err.message);
      throw new BadRequestException('数据异常，请稍后再试');
    } finally {
      // 释放
      await queryRunner.release();
    }
  }

  /**
   * 推送队列
   * @param user
   * @param watch
   * @param watchRecord
   * @param triggerType
   */
  async pushWatchQueue(
    user: IUserPayload,
    watch: any,
    watchRecord: any,
    triggerType = 'manual',
  ) {
    // 超时错误
    const watchCloseJob = await this.watchQueue.add(
      'watch-close',
      {
        user,
        watch,
        watchRecord,
        triggerType,
      },
      {
        delay: 10 * 600e3, // 10分钟后关闭
        removeOnComplete: true,
        removeOnFail: true,
      },
    );
    // 队列执行证书申请操作
    await this.watchQueue.add(
      'watch-create',
      {
        user,
        watch,
        watchRecord,
        closeJobId: watchCloseJob.id,
      },
      {
        attempts: 5,
        removeOnComplete: true,
        removeOnFail: true,
      },
    );
  }

  /**
   * 证书监听信息
   * @param user
   * @param id
   */
  async info(user: IUserPayload, id: number) {
    const info = await this.watchRepository.findOneBy({
      id,
      userId: user.id,
    });
    if (info) return info;
    throw new BadRequestException('监控信息找不到');
  }

  /**
   * 更新信息
   * @param user
   * @param id
   * @param data
   */
  async update(user: IUserPayload, id: number, data: UpdateWatchIDto) {
    const info = await this.info(user, id);
    if (info) {
      const updateData = plainToInstance(WatchInfoDto, data, {
        excludeExtraneousValues: true,
      });
      return await this.updateWatchById(id, updateData);
    }
    throw new BadRequestException('暂未开放');
  }

  /**
   * id 更新监控
   * @param id
   * @param data
   */
  async updateWatchById(id: number, data: WatchInfoDto) {
    const info = await this.watchRepository.findOneBy({
      id,
    });
    if (info) {
      const updateEntity = plainToInstance(WatchEntity, data, {
        excludeExtraneousValues: true,
      });
      this.logger.debug('updateEntity');
      console.log(updateEntity);
      return await this.watchRepository.update(info.id, updateEntity);
    }
    throw new BadRequestException('监控信息找不到');
  }

  /**
   * 证书监听信息
   * @param user
   * @param id
   * @param query
   */
  async listRecord(user: IUserPayload, id: number, query: any) {
    // 提取参数
    const { pageNum = 1, pageSize = 10, sortBy, sortOrder } = query;
    // createQueryBuilder
    const queryBuilder = this.watchRecordRepository
      .createQueryBuilder('wr')
      .leftJoinAndSelect('wr.certificate', 'wc')
      .where('wr.watch_id = :cid', {
        cid: id,
      })
      .select('wr')
      .addSelect([
        'wc.issuer as wr_issuer',
        'wc.validTo as wr_expiredTime',
        'wc.revokedTime as wr_revokedTime',
      ]);
    // 排序筛选
    if (sortBy && sortOrder) {
      queryBuilder.addOrderBy(`wr.${sortBy}`, sortOrder);
    }
    const [list, total] = await queryBuilder
      .offset((pageNum - 1) * pageSize)
      .limit(pageSize)
      .getManyAndCount();
    return {
      total,
      records: list,
    };
  }
  async recordInfo(user: IUserPayload, id: number, rid: number) {
    const info = await this.info(user, id);
    if (info) {
      //
      const queryBuilder = this.watchRecordRepository
        .createQueryBuilder('wr')
        .leftJoinAndSelect('wr.watch', 'w')
        .leftJoinAndSelect('wr.certificate', 'wc');
      return await queryBuilder
        .where('wr.id = :id and wr.watch_id = :watchId', {
          id: rid,
          watchId: id,
        })
        .select([
          'wr',
          'w.name',
          'w.alias',
          'wc.subject',
          'wc.subjectaltname',
          'wc.bits',
          'wc.serialNumber',
          'wc.issuer',
          'wc.modulus',
          'wc.pubkey',
          'wc.exponent',
          'wc.fingerprint',
          'wc.fingerprint256',
          'wc.validFrom',
          'wc.validTo',
          'wc.revokedTime',
          'wc.certificateInPem',
          'wc.issuerCertificateInPem',
        ])
        .getOne();
    }
    throw new BadRequestException('数据异常，请稍后尝试');
  }

  /**
   * 新增记录
   * @param user
   * @param watch
   * @param latestWatchRecord
   * @param triggerType
   */
  async renewRecord(
    user: IUserPayload,
    watch: any,
    latestWatchRecord: any,
    triggerType = 'manual',
  ) {
    if (watch) {
      // 扣费前置检查
      await this.billingService.preCheckUserCoin(user);
      // 检查是否还存在监控任务,没有任务就直接结束了
      const watchInfo = await this.info(user, watch.id);
      if (!watchInfo?.id) return;
      // 创建记录
      const recordRepo = this.watchRecordRepository.create({
        watchId: watch.id,
        watchCertificateId: latestWatchRecord.watchCertificateId,
      });
      const watchRecord = await this.watchRecordRepository.save(recordRepo);
      this.logger.debug('watchRecord completed:' + JSON.stringify(watchRecord));
      // 推送队列
      await this.pushWatchQueue(user, watch, watchRecord, triggerType);
      return true;
    }
    throw new BadRequestException('数据异常，请稍后尝试');
  }

  /**
   * 重载队列
   * @param user
   * @param id
   * @param rid
   */
  async reloadRecord(user: IUserPayload, id: number, rid: number) {
    const watch = await this.info(user, id);
    const watchRecord = await this.watchRecordRepository.findOneBy({
      id: rid,
      watchId: id,
    });
    if (watch && watchRecord) {
      // 推送队列
      return await this.pushWatchQueue(user, watch, watchRecord);
    }
    throw new BadRequestException('数据异常，请稍后尝试');
  }

  /**
   * id 更新记录
   * @param id
   * @param data
   * @param triggerType
   */
  async updateWatchRecordById(
    id: number,
    data: WatchRecordInfoDto,
    triggerType = 'manual',
  ) {
    const recordInfo = await this.watchRecordRepository.findOneBy({
      id,
    });
    if (recordInfo) {
      // watch
      const watchInfo = await this.watchRepository.findOneBy({
        id: recordInfo?.watchId,
      });
      const updateRecordEntity = plainToInstance(WatchRecordEntity, data, {
        excludeExtraneousValues: true,
      });
      this.logger.debug('updateEntity');
      console.log(updateRecordEntity);
      await this.watchRecordRepository.update(
        recordInfo.id,
        updateRecordEntity,
      );
      // TODO 消费
      await this.billingService.triggerBilling(
        watchInfo.userId,
        'certificate',
        'watch',
        triggerType,
      );
      return recordInfo;
    }
    throw new BadRequestException('监控信息找不到');
  }

  /**
   * 创建证书信息
   * @param data
   */
  async createOrUpdateWatchCertificate(data: WatchCertificateInfoDto) {
    // 通过serial_number做唯一
    const certificate = await this.watchCertificateRepository.findOneBy({
      serialNumber: data.serialNumber,
    });

    try {
      // 存在证书更新
      if (certificate) {
        // 证书更新就revokedTime有变动
        if (data.revokedTime) {
          certificate.revokedTime = new Date(data.revokedTime);
        }
        return await this.watchCertificateRepository.save(certificate);
      } else {
        const watchCertificateRepo = this.watchCertificateRepository.create({
          ...data,
        });
        return await this.watchCertificateRepository.save(watchCertificateRepo);
      }
    } catch (err) {
      this.logger.error('create or update watch certificate err: ' + err);
      throw new BadRequestException('创建证书信息错误');
    }
  }

  /**
   * 批量删除
   * @param user
   * @param ids
   */
  async deleteWatchIds(user: IUserPayload, ids: number[]) {
    return Promise.all(
      ids.map(async (id) => {
        return await this.deleteWatch(user, id);
      }),
    );
  }

  /**
   * 删除监控数据
   * @param user
   * @param id
   */
  async deleteWatch(user: IUserPayload, id: number) {
    const info = await this.info(user, id);
    // TODO startTransaction
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      // 1.删除监控
      await queryRunner.manager.delete(WatchEntity, { id: info.id });
      // 2.删除监控记录
      await queryRunner.manager.delete(WatchRecordEntity, { watchId: info.id });
      // 获取记录的证书列表ids
      const watchCertificateIds = await this.watchRecordRepository
        .find({
          where: { watchId: info.id },
          select: ['watchCertificateId'],
        })
        .then((record) => record.map((result) => result.watchCertificateId));
      // 3.删除监控证书
      await queryRunner.manager.delete(WatchCertificateEntity, {
        id: In(_.uniq(watchCertificateIds)),
      });

      // commitTransaction
      await queryRunner.commitTransaction();
      return info;
    } catch (err) {
      // rollbackTransaction
      await queryRunner.rollbackTransaction();
      this.logger.error('delete watch err:' + err.message);
      throw new BadRequestException('数据异常，请稍后再试');
    } finally {
      // 释放
      await queryRunner.release();
    }
  }

  /**
   * 获取数据
   */
  async getTheMissedWatches() {
    // 取得超时时间
    const thresholdTime = dayjs()
      .subtract(24, 'hour')
      .subtract(10, 'minute')
      .toDate();
    return this.watchRepository
      .createQueryBuilder('w')
      .leftJoinAndSelect(WatchRecordEntity, 'wr', 'wr.id = w.latest_record_id')
      .where(`wr.createTime < :thresholdTime`, {
        thresholdTime,
      })
      .select()
      .addSelect(['w.userId'])
      .addSelect(['wr.watchCertificateId as w_watchCertificateId'])
      .getMany();
  }
}
