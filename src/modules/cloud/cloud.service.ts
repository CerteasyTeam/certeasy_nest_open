import {
  Injectable,
  Inject,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { plainToInstance } from 'class-transformer';
// entities
import {
  CloudEntity,
  CloudProviderEntity,
  CloudCertificateEntity,
  CloudProviderProductEntity,
  CloudDeployEntity,
} from './entities';
import { NotificationService } from '@app/modules/notification/notification.service';
// dtos
import {
  QueryCloudDto,
  CreateCloudIDto,
  QueryCloudProviderDto,
  CloudInfoDto,
  QueryCloudDeployDto,
  CloudDeployInfoDto,
  CheckCloudIDto,
} from './dtos';

import { CloudFactory } from '@app/utils';
// billing
import { BillingService } from '@app/share';

@Injectable()
export class CloudService {
  // logger
  readonly logger = new Logger(CloudService.name);
  constructor(
    private readonly dataSource: DataSource,
    private readonly billingService: BillingService,
    private readonly notificationService: NotificationService,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
    @InjectQueue('cloud')
    private cloudQueue: Queue,
    @InjectRepository(CloudEntity)
    private readonly cloudRepository: Repository<CloudEntity>,
    @InjectRepository(CloudProviderEntity)
    private readonly cloudProviderRepository: Repository<CloudProviderEntity>,
    @InjectRepository(CloudProviderProductEntity)
    private readonly cloudProviderProductRepository: Repository<CloudProviderProductEntity>,
    @InjectRepository(CloudCertificateEntity)
    private readonly cloudCertificateRepository: Repository<CloudCertificateEntity>,
    @InjectRepository(CloudDeployEntity)
    private readonly cloudDeployRepository: Repository<CloudDeployEntity>,
  ) {}

  /**
   * 部署总览
   * @param user
   */
  async loadOverview(user: IUserPayload) {
    const where = { userId: user.id };
    return {
      totalCount: await this.cloudRepository.count({ where }),
    };
  }

  /**
   * 部署总览
   * @param user
   */
  async loadDeployOverview(user: IUserPayload) {
    // 统计
    const countResult = await this.cloudRepository
      .createQueryBuilder('c')
      .innerJoin('c.certificate', 'cc')
      .innerJoin('cc.deployments', 'ccd')
      .where('c.user_id = :userId', { userId: user.id })
      .select('COUNT(ccd.id)', 'totalCount')
      .addSelect([
        'SUM(CASE WHEN ccd.status = 1 THEN 1 ELSE 0 END) AS inDeployingCount',
        'SUM(CASE WHEN ccd.status = 2 THEN 1 ELSE 0 END) AS successCount',
        'SUM(CASE WHEN ccd.status = 0 THEN 1 ELSE 0 END) AS failedCount',
      ])
      .getRawOne();
    return {
      ...countResult,
    };
  }

  /**
   * 云资源服务商数据列表
   * @param user
   * @param query
   */
  async listProvider(user: IUserPayload, query: QueryCloudProviderDto) {
    // 提取参数
    const {
      pageNum = 1,
      pageSize = 20,
      sortBy = 'createTime',
      sortOrder = 'ASC',
    } = query;
    // createQueryBuilder
    const queryBuilder = this.cloudProviderRepository
      .createQueryBuilder('cp')
      .leftJoinAndMapMany('cp.providers', 'cp.providerProducts', 'cpp')
      .where('cp.status = :status', { status: 1 })
      .select('cp')
      .addSelect(['cpp']);
    // 排序筛选
    if (sortBy && sortOrder) {
      queryBuilder.addOrderBy(`cp.${sortBy}`, sortOrder);
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

  /**
   * 云资源数据列表
   * @param user
   * @param query
   */
  async list(user: IUserPayload, query: QueryCloudDto) {
    // 提取参数
    const { keyword, pageNum = 1, pageSize = 10, sortBy, sortOrder } = query;
    // createQueryBuilder
    const queryBuilder = this.cloudRepository
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.certificates', 'cc')
      .leftJoinAndSelect('c.provider', 'cp')
      .leftJoinAndSelect('c.providerProduct', 'cpp')
      .where('c.user_id = :userId', { userId: user.id })
      .loadRelationCountAndMap('c.certificatesCount', 'c.certificates')
      .select('c')
      .addSelect([
        'COALESCE(cp.alias, cp.name) as c_providerName',
        'cp.logo as c_providerLogo',
        'COALESCE(cpp.alias, cpp.name) as c_providerProductName',
        'cpp.alias as c_providerProductAliasName',
      ]);
    // 关键词筛选
    if (keyword) {
      queryBuilder.andWhere(`c.name LIKE :keyword or c.alias LIKE :keyword`, {
        keyword: `%${keyword}%`,
      });
    }
    // 排序筛选
    if (sortBy && sortOrder) {
      queryBuilder.addOrderBy(`c.${sortBy}`, sortOrder);
    }
    console.log(queryBuilder.getSql());
    const [list, total] = await queryBuilder
      .offset((pageNum - 1) * pageSize)
      .limit(pageSize)
      .getManyAndCount();
    return {
      total,
      records: list,
    };
  }

  /**
   * 获取详情数据
   * @param user
   * @param data
   */
  async create(user: IUserPayload, data: CreateCloudIDto) {
    const { accessJson, providerId, providerProductId, certificateIds } = data;
    const providerInfo = await this.cloudProviderProductRepository.findOneBy({
      id: providerProductId,
      providerId: providerId,
    });
    if (!providerInfo) throw new BadRequestException('供应商数据错误');
    // TODO 必要校验accessJson 是否正确,使用对应provider的sdk进行查询权限
    try {
      const cloudRepo = this.cloudRepository.create({
        userId: user.id,
        providerId,
        providerProductId,
        accessJson,
      });
      const cloud = await this.cloudRepository.save(cloudRepo);
      this.logger.debug('cloud completed:' + JSON.stringify(cloud));
      // 写入关联表
      const cloudCertificates = certificateIds.map((cid) => {
        return this.cloudCertificateRepository.create({
          cloudId: cloud.id,
          certificateId: cid,
        });
      });
      // 批量写入
      await this.cloudCertificateRepository.save(cloudCertificates);
      // todo 首次加入，下发部署队列
      return await this.info(user, cloud.id);
    } catch (err) {
      this.logger.error('create cloud err: ' + err.message);
      throw new BadRequestException('新增cloud授权错误');
    }
  }

  /**
   * 获取详情
   * @param user
   * @param id
   */
  async info(user: IUserPayload, id: number) {
    const queryBuilder = this.cloudRepository
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.certificates', 'cc')
      .leftJoinAndSelect('c.provider', 'cp')
      .leftJoinAndSelect('c.providerProduct', 'cpp')
      .where('c.user_id = :userId and c.id = :id', { userId: user.id, id })
      .loadRelationCountAndMap('c.certificatesCount', 'c.certificates')
      .select('c')
      .addSelect(['cc.id', 'cc.name', 'cc.alias', 'cc.type', 'cc.domains'])
      .addSelect([
        'COALESCE(cp.alias, cp.name) as c_providerName',
        'cp.logo as c_providerLogo',
        'COALESCE(cpp.alias, cpp.name) as c_providerProductName',
        'cpp.configJson as c_providerProductConfigJson',
      ]);
    const info = await queryBuilder.getOne();
    if (info) return info;
    throw new BadRequestException('未找到cloud数据');
  }

  /**
   * 更新cloud授权配置
   * @param user
   * @param id
   * @param data
   */
  async update(user: IUserPayload, id: number, data: CloudInfoDto) {
    console.log('data', data);
    const info = await this.cloudRepository.findOneBy({
      userId: user.id,
      id,
    });
    if (info) {
      const updateEntity = plainToInstance(CloudEntity, data, {
        excludeExtraneousValues: true,
      });
      console.log('updateEntity', updateEntity);
      return await this.cloudRepository.update(info.id, updateEntity);
    }
    throw new BadRequestException('未找到该云资源数据');
  }

  /**
   * 批量删除
   * @param user
   * @param ids
   */
  async deleteIds(user: IUserPayload, ids: number[]) {
    return Promise.all(
      ids.map(async (id) => {
        return await this.delete(user, id);
      }),
    );
  }

  /**
   * 删除资源
   * @param user
   * @param id
   */
  async delete(user: IUserPayload, id: number) {
    const info = await this.cloudRepository.findOneBy({
      userId: user.id,
      id,
    });
    if (info) {
      // TODO startTransaction
      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();
      try {
        // 删除资源需要删除关联表数据（部署表、资源证书关联表）
        await queryRunner.manager.delete(CloudCertificateEntity, {
          cloudId: info.id,
        });
        // 删除资源
        await queryRunner.manager.delete(CloudEntity, { id: info.id });
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
    throw new BadRequestException('未找到该云资源数据');
  }

  /**
   * 获取关联的云资源
   * @param certificate
   * @param pagination
   * @param query
   */
  async loadAssociatedForCertificate(
    certificate: any,
    pagination?: boolean,
    query?: QueryCloudDeployDto,
  ) {
    const queryBuilder = this.cloudCertificateRepository
      .createQueryBuilder('cc')
      .leftJoinAndSelect('cc.cloud', 'c')
      .leftJoinAndSelect('c.provider', 'cp')
      .leftJoinAndSelect('c.providerProduct', 'cpp')
      .where('cc.certificate_id = :certificateId and cc.status = :status', {
        certificateId: certificate.id,
        status: 1,
      })
      .select('cc')
      .addSelect([
        'cp.id as cc_providerId',
        'COALESCE(cp.alias, cp.name) as cc_providerName',
        'cp.logo as cc_providerLogo',
        'COALESCE(c.alias, c.name) as cc_name',
        'c.providerProductId as cc_providerProductId',
        'COALESCE(cpp.alias, cpp.name) as cc_providerProductName',
      ]);
    if (pagination) {
      const { pageNum, pageSize } = query;
      const [list, total] = await queryBuilder
        .offset((pageNum - 1) * pageSize)
        .limit(pageSize)
        .getManyAndCount();
      return {
        total,
        records: list,
      };
    }
    return await queryBuilder.getMany();
  }

  /**
   * 更新云资源关联数据
   * @param certificate
   * @param cloudIds
   */
  async updateAssociatedForCertificate(certificate: any, cloudIds: any[]) {
    // 查询原来的
    const originalSource = await this.cloudCertificateRepository
      .createQueryBuilder()
      .select()
      .where({ certificateId: certificate.id })
      .getMany();
    try {
      // cloudIds = [1,2,3]
      // originalSource = [1,2]
      // ===> 新增3
      // cloudIds = [1,3]
      // originalSource = [1,2.3]
      // ===> 删除2
      // cloudIds = [1,2,3]
      // originalSource = []
      // ===> 全新增
      const originalSourceCloudIdMap = new Map(
        originalSource.map((original) => [original.cloudId, original]),
      );
      // 全部先置为0
      await this.cloudCertificateRepository
        .createQueryBuilder()
        .update({ status: 0 })
        .where({ certificateId: certificate.id })
        .execute();
      // 处理相关状态再写入关联表
      const cloudCertificates = cloudIds.map((cloudId) => {
        // 如果存在原来的则更新
        if (originalSourceCloudIdMap.has(cloudId)) {
          const originalCertificate = originalSourceCloudIdMap.get(cloudId);
          return this.cloudCertificateRepository.create({
            id: originalCertificate.id,
            cloudId: cloudId,
            certificateId: certificate.id,
            status: 1,
          });
        } else {
          return this.cloudCertificateRepository.create({
            cloudId: cloudId,
            certificateId: certificate.id,
          });
        }
      });
      console.log('cloudCertificates', cloudCertificates);
      // 批量写入
      return await this.cloudCertificateRepository.save(cloudCertificates);
    } catch (err) {
      this.logger.error('updateAssociatedForCertificate err:' + err.message);
      throw new BadRequestException('更新云资源数据错误');
    }
  }

  /**
   * 云资源部署列表
   * @param user
   * @param id
   * @param query
   */
  async deployList(user: IUserPayload, id: number, query: QueryCloudDeployDto) {
    // 提取参数
    const { pageNum = 1, pageSize = 10, sortBy, sortOrder } = query;
    const queryBuilder = this.cloudDeployRepository
      .createQueryBuilder('cd')
      .leftJoinAndSelect('cd.cloudCertificate', 'cc')
      .leftJoinAndSelect('cc.cloud', 'c')
      .leftJoinAndSelect('c.provider', 'cp')
      .leftJoinAndSelect('c.providerProduct', 'cpp')
      .leftJoinAndSelect('cc.certificate', 'ccc')
      .where('c.id = :cloudId and c.user_id = :userId', {
        cloudId: id,
        userId: user.id,
      })
      .select('cd')
      .addSelect([
        'c.providerProductId as cd_providerProductId',
        'cpp.name as cd_providerProductName',
        'cp.id as cd_providerId',
        'cp.name as cd_providerName',
        // 'cp.logo as cd_providerLogo',
        'ccc.id as cd_certificateId',
        'ccc.name as cd_certificateName',
        'ccc.domains as cd_certificateDomains',
        'ccc.latestVersionId as cd_certificateVersionId',
      ]);

    // 排序筛选
    if (sortBy && sortOrder) {
      queryBuilder.addOrderBy(`cd.${sortBy}`, sortOrder);
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

  /**
   * 证书部署记录
   * @param user
   * @param certificateId
   * @param query
   */
  async certificateDeployList(
    user: IUserPayload,
    certificateId?: number,
    query?: QueryCloudDeployDto,
  ) {
    // 提取参数
    const { keyword, pageNum = 1, pageSize = 10, sortBy, sortOrder } = query;
    const queryBuilder = this.cloudDeployRepository
      .createQueryBuilder('cd')
      .leftJoinAndSelect('cd.cloudCertificate', 'cc')
      .leftJoinAndSelect('cc.cloud', 'c')
      .leftJoinAndSelect('c.provider', 'cp')
      .leftJoinAndSelect('c.providerProduct', 'cpp')
      .leftJoinAndSelect('cc.certificate', 'ccc')
      .where('c.user_id = :userId and cc.status = :status', {
        userId: user.id,
        status: 1, // 还绑定的才查询
      })
      .select('cd')
      .addSelect([
        'c.id as cd_cloudId',
        'COALESCE(c.alias, c.name) as cd_name',
        'c.providerProductId as cd_providerProductId',
        'COALESCE(cpp.alias, cpp.name) as cd_providerProductName',
        'cp.id as cd_providerId',
        'COALESCE(cp.alias, cp.name) as cd_providerName',
        'cp.logo as cd_providerLogo',
        'ccc.id as cd_certificateId',
        'ccc.name as cd_certificateName',
        'ccc.alias as cd_certificateAlias',
        'ccc.type as cd_certificateType',
        'ccc.domains as cd_certificateDomains',
        'ccc.latestVersionId as cd_certificateVersionId',
      ]);

    // 关键词筛选
    if (keyword) {
      queryBuilder.andWhere(
        `ccc.name LIKE :keyword or ccc.alias LIKE :keyword or ccc.domains LIKE :keyword`,
        {
          keyword: `%${keyword}%`,
        },
      );
    }
    // 相关证书筛选
    if (certificateId) {
      queryBuilder.andWhere(`cc.certificate_id = :certificateId`, {
        certificateId,
      });
    }
    // 排序筛选
    if (sortBy && sortOrder) {
      queryBuilder.addOrderBy(`cd.${sortBy}`, sortOrder);
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

  /**
   * 云资源部署
   * @param user
   * @param id
   */
  async deploy(user: IUserPayload, id: number) {
    // 扣费前置检查
    await this.billingService.preCheckUserCoin(user);
    // 获取证书版本数据，provider, accessJson 等数据压入队列
    const waitingDeployList = await this.cloudCertificateRepository
      .createQueryBuilder('cc')
      .leftJoinAndSelect('cc.cloud', 'c')
      .leftJoinAndSelect('c.provider', 'cp')
      .leftJoinAndSelect('c.providerProduct', 'cpp')
      .leftJoinAndSelect('cc.certificate', 'ccc')
      .leftJoinAndSelect('ccc.latestValidVersion', 'cccl')
      .leftJoinAndSelect('cccl.detail', 'cccld')
      .where({
        cloudId: id,
      })
      .select([
        'cc.id as id',
        'COALESCE(ccc.alias, ccc.name) as name',
        'c.accessJson as accessJson',
        'cp.name as providerName',
        'cpp.name as providerProductName',
        'cccld.key as certKey',
        'cccld.certificate as certCsr',
      ])
      .groupBy('id')
      .getRawMany();
    // 写入部署记录
    return await this.saveCloudDeployRepos(user, waitingDeployList);
  }

  /**
   *
   * @param user
   * @param certificateId
   * @param cloudIds
   * @param triggerType
   */
  async actionDeploy(
    user: IUserPayload,
    certificateId: number,
    cloudIds: number[],
    triggerType = 'manual',
  ) {
    // 获取证书版本数据，provider, accessJson 等数据压入队列
    const waitingDeployList = await this.cloudCertificateRepository
      .createQueryBuilder('cc')
      .leftJoinAndSelect('cc.cloud', 'c')
      .leftJoinAndSelect('c.provider', 'cp')
      .leftJoinAndSelect('c.providerProduct', 'cpp')
      .leftJoinAndSelect('cc.certificate', 'ccc')
      .leftJoinAndSelect('ccc.latestValidVersion', 'cccl')
      .leftJoinAndSelect('cccl.detail', 'cccld')
      .where('cc.certificateId = :certificateId', { certificateId })
      .andWhere({
        cloudId: In(cloudIds),
      })
      .select([
        'cc.id as id',
        'COALESCE(ccc.alias, ccc.name) as name',
        'c.accessJson as accessJson',
        'cp.name as providerName',
        'cpp.name as providerProductName',
        'cccld.key as certKey',
        'cccld.certificate as certCsr',
      ])
      .groupBy('id')
      .getRawMany();
    // 写入部署记录
    return await this.saveCloudDeployRepos(
      user,
      waitingDeployList,
      triggerType,
    );
  }

  /**
   * 保存部署记录
   * @param user
   * @param waitingDeployList
   * @param triggerType
   */
  async saveCloudDeployRepos(
    user: IUserPayload,
    waitingDeployList: any[],
    triggerType = 'manual',
  ) {
    try {
      // 写入关联表
      const cloudDeploys = waitingDeployList.map((waiting) => {
        return this.cloudDeployRepository.create({
          cloudCertificateId: waiting.id,
        });
      });
      // 批量写入
      const cloudDeploy = await this.cloudDeployRepository.save(cloudDeploys);
      // TODO 下发队列，每个云资源关联单独一个队列
      waitingDeployList.map(async (waiting, idx) => {
        await this.cloudQueue.add(
          'deploy',
          {
            user,
            waiting,
            deploy: cloudDeploy[idx],
            triggerType,
          },
          {
            delay: 5e3,
            attempts: 3,
            removeOnComplete: true,
            removeOnFail: true,
          },
        );
      });
      return waitingDeployList.map((waiting) => ({
        id: waiting.id,
        name: waiting.name,
      }));
    } catch (err) {
      this.logger.error('waiting action deploy err:' + err.message);
      throw new BadRequestException('证书部署错误，数据异常');
    }
  }
  /**
   * 更新部署信息
   * @param user
   * @param id
   * @param data
   * @param triggerType
   */
  async updateDeployByID(
    user: IUserPayload,
    id: number,
    data: CloudDeployInfoDto,
    triggerType: string,
  ) {
    const deployInfo = await this.cloudDeployRepository.findOneBy({
      id,
    });
    if (deployInfo) {
      const updateEntity = plainToInstance(CloudDeployEntity, data, {
        excludeExtraneousValues: true,
      });
      await this.cloudDeployRepository.update(deployInfo.id, updateEntity);

      // TODO 加载云资源和证书信息 下发通知
      const cloudList = await this.cloudCertificateRepository
        .createQueryBuilder('cc')
        .leftJoinAndSelect('cc.cloud', 'c')
        .leftJoinAndSelect('cc.certificate', 'ccc')
        .leftJoinAndSelect('cc.deployment', 'ccd')
        .leftJoinAndSelect('c.provider', 'cp')
        .leftJoinAndSelect('c.providerProduct', 'cpp')
        .where('cc.id = :id', {
          id: deployInfo.cloudCertificateId,
        })
        .select([
          'cc.id as id',
          'ccd.error as error',
          'ccd.status as status',
          'COALESCE(c.alias, c.name) as name',
          'COALESCE(ccc.alias, ccc.name) as certificate',
          'ccc.domains as domains',
          'cp.name as providerName',
          'cp.logo as providerLogo',
          'cpp.name as providerProductName',
        ])
        .getRawMany();
      // 下发部署结果通知
      await this.notificationService.triggerNotification(user, 5, {
        clouds: cloudList || [],
      });
      // TODO 消费 手动部署证书
      await this.billingService.triggerBilling(
        user.id,
        'certificate',
        'deploy',
        triggerType || 'manual',
      );
      return deployInfo;
    }
    throw new BadRequestException('部署信息找不到，请检查参数是否正确');
  }

  /**
   * CLOUD授权检查
   * @param user
   * @param data
   */
  async check(user: IUserPayload, data: CheckCloudIDto) {
    const providerInfo = await this.cloudProviderProductRepository
      .createQueryBuilder('cpp')
      .leftJoinAndSelect('cpp.provider', 'cp')
      .where('cpp.id = :id and cpp.providerId = :providerId', {
        id: data.providerProductId,
        providerId: data.providerId,
      })
      .select('cpp.name as providerProductName,cp.name as providerName')
      .getRawOne();
    if (!providerInfo) throw new BadRequestException('供应商数据错误，请检查');
    let error = null,
      result = false;
    try {
      const { providerName, providerProductName } = providerInfo;
      console.log(
        'providerName, providerProductName',
        providerName,
        providerProductName,
      );
      // 请求接口
      const cloudFactory = CloudFactory.createProvider(
        providerName,
        data.accessJson,
      );
      result = await cloudFactory.preCheck(providerProductName);
    } catch (err) {
      this.logger.error('cloud check err:' + err.message);
      error = err.message || '供应商数据错误，请检查';
      if (err.message.includes('403')) {
        error =
          '用户无权进行操作，请先检查配置是否正确以及是否赋予对应的RAM权限';
      }
    }
    // return
    return {
      error,
      result,
    };
  }
}
