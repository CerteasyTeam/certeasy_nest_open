import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Between,
  DataSource,
  In,
  LessThanOrEqual,
  Repository,
  IsNull,
} from 'typeorm';
// bull
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { plainToInstance } from 'class-transformer';
// acme
import * as acme from 'acme-client';
import * as path from 'path';
import * as fs from 'fs';
import * as dayjs from 'dayjs';
// entities
import {
  CertificateAccountEntity,
  CertificateDetailEntity,
  CertificateEntity,
  CertificateVersionEntity,
} from './entities';
// dtos
import {
  CertificateInfoDto,
  CertificateVersionInfoDto,
  ConfigCertificateDto,
  CreateCertificateDto,
  DeployCertificateDto,
  QueueCertificateDto,
  QueueCertificateVersionDto,
  UpdateCertificateDto,
} from './dtos';
import {
  archiverContent,
  extractDomainWithPrefix,
  readCertificateInfo,
} from '@app/utils';
// dns module
import { DnsService } from '@app/modules/dns/dns.service';
import { CloudService } from '@app/modules/cloud/cloud.service';

import {
  CERTIFICATE_AUTH_MODE,
  CERTIFICATE_TYPE,
  DATE_FORMAT,
} from '@app/common';
// AcmeService
import { AcmeService } from '@app/share/acme/acme.service';
import { getCertStatus } from 'easy-ocsp';
// billing
import { BillingService } from '@app/share';
import * as _ from 'lodash';

@Injectable()
export class CertificateService {
  // logger
  readonly logger = new Logger(CertificateService.name);
  constructor(
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
    private readonly billingService: BillingService,
    private readonly dnsService: DnsService,
    private readonly cloudService: CloudService,
    private readonly acmeService: AcmeService,
    @InjectQueue('certificate')
    private certificateQueue: Queue,
    @InjectRepository(CertificateAccountEntity)
    private readonly certificateAccountRepository: Repository<CertificateAccountEntity>,
    @InjectRepository(CertificateEntity)
    private readonly certificateRepository: Repository<CertificateEntity>,
    @InjectRepository(CertificateVersionEntity)
    private readonly certificateVersionRepository: Repository<CertificateVersionEntity>,
    @InjectRepository(CertificateDetailEntity)
    private readonly certificateDetailRepository: Repository<CertificateDetailEntity>,
  ) {}

  /**
   * 证书总览
   * @param user
   */
  async loadOverview(user: IUserPayload) {
    const where = { userId: user.id };
    const userCertificateIds = await this.certificateRepository
      .find({ select: ['id'], where })
      .then((certificate) => certificate.map((result) => result.id));

    // 计算15天内到期
    const willExpiredCount = await this.certificateVersionRepository.countBy({
      certificateId: In(userCertificateIds),
      expiredTime: Between(
        dayjs().startOf('day').format(DATE_FORMAT),
        dayjs().add(15, 'day').endOf('day').format(DATE_FORMAT),
      ),
    });
    // 计算到期的
    const inExpiredCount = await this.certificateVersionRepository.countBy({
      certificateId: In(userCertificateIds),
      expiredTime: LessThanOrEqual(dayjs().startOf('day').format(DATE_FORMAT)),
    });
    return {
      totalCount: Math.abs(userCertificateIds.length),
      issuedCount: await this.certificateVersionRepository.countBy({
        certificateId: In(userCertificateIds),
        status: 2,
      }),
      inEffectiveCount: await this.certificateVersionRepository.countBy({
        certificateId: In(userCertificateIds),
        status: 2,
      }),
      willExpiredCount,
      inExpiredCount:
        inExpiredCount ||
        (await this.certificateVersionRepository.countBy({
          certificateId: In(userCertificateIds),
          status: 3,
        })),
    };
  }

  /**
   * 提交证书申请
   * @param user
   * @param data
   */
  async create(user: IUserPayload, data: CreateCertificateDto) {
    // 处理accessJson数据
    const { dnsServerAccessJson, dnsProviderId } = data;
    // 有provider 没有 dnsServer 就是新增
    if (
      dnsProviderId &&
      !data.dnsServerId &&
      data.authMode == CERTIFICATE_AUTH_MODE.DNS_AUTH_MODE
    ) {
      const dnsInfo = await this.dnsService.create(user, {
        providerId: dnsProviderId,
        accessJson: dnsServerAccessJson,
      });
      // 重新赋值
      data.dnsServerId = dnsInfo?.id;
    }
    // 扣费前置检查
    await this.billingService.preCheckUserCoin(user);
    // TODO startTransaction
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      // 如果是泛域名证书，需要补充主域名  *.certeasy.cn、certeasy.cn
      // if (
      //   data.type === CERTIFICATE_TYPE.WILDCARD &&
      //   data.domains.length === 1
      // ) {
      //   const { domain } = extractDomainWithPrefix(data.domains[0]);
      //   data.domains.push(domain);
      // }
      // 申请证书流程
      // 1.写入数据表（证书表，证书版本/历史表）
      const certificateRepo = this.certificateRepository.create({
        userId: user.id,
        dnsServerId: data.dnsServerId,
        certAgency: data.certAgency,
        domains: data.domains,
        type: data.type,
        authMode: data.authMode,
      });
      const certificate = await queryRunner.manager.save(certificateRepo);
      this.logger.debug('certificate completed:' + JSON.stringify(certificate));
      // 创建证书版本
      const certificateVersionRepo = this.certificateVersionRepository.create({
        certificateId: certificate.id,
        status: 1,
      });
      const certificateVersion = await queryRunner.manager.save(
        certificateVersionRepo,
      );
      this.logger.debug(
        'certificateVersion completed:' + JSON.stringify(certificateVersion),
      );
      // commitTransaction
      await queryRunner.commitTransaction();
      // 更新最新版本
      certificate.latestVersionId = certificateVersion.id;
      await this.updateCertificateById(certificate.id, {
        latestVersionId: certificateVersion.id,
        latestValidVersionId: null, // 初始化创建没数据
      });
      // 队列执行证书申请操作
      await this.certificateQueue.add(
        'acme-order',
        {
          user,
          certificate,
          certificateVersion,
          update: false,
        },
        {
          delay: 3e3,
          attempts: 5,
          removeOnComplete: true,
          removeOnFail: true,
        },
      );
      // TODO 消费 证书类型消费 - 创建的时候收取
      await this.billingService.triggerBilling(
        user.id,
        'certificate',
        'create',
        Object.keys(CERTIFICATE_TYPE).find(
          (key) => CERTIFICATE_TYPE[key] === data.type,
        ),
      );
      return {
        ...certificate,
        latestVersionId: certificateVersion.id,
        latestValidVersionId: '',
      };
    } catch (e) {
      // rollbackTransaction
      await queryRunner.rollbackTransaction();
      this.logger.error('create certificate error:' + e.message);
      throw new BadRequestException('资源错误，请稍后再试');
    } finally {
      // 释放
      await queryRunner.release();
    }
  }
  /**
   * 查询证书列表
   * @param user
   * @param query
   * @returns
   */
  async list(user: IUserPayload, query: QueueCertificateDto) {
    // 提取参数
    const { keyword, pageNum = 1, pageSize = 10, sortBy, sortOrder } = query;
    // createQueryBuilder
    const queryBuilder = this.certificateRepository
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.latestVersion', 'cv')
      .loadRelationCountAndMap('c.versionsCount', 'c.certificateVersions')
      .where('c.user_id = :userId', { userId: user.id })
      .select('c')
      .addSelect([
        'cv.expiredTime as c_expiredTime',
        'cv.status as c_latestVersionStatus',
        'cv.updateTime as c_latestVersionTime',
        'cv.revokedTime as c_revokedTime',
      ]);
    // 关键词筛选
    if (keyword) {
      queryBuilder.andWhere(
        `c.name LIKE :keyword or c.alias LIKE :keyword or c.domains LIKE :keyword`,
        {
          keyword: `%${keyword}%`,
        },
      );
    }
    // 排序筛选
    if (sortBy && sortOrder) {
      queryBuilder.addOrderBy(`c.${sortBy}`, sortOrder);
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
   * 获取证书信息
   * @param user
   * @param id
   * @returns
   */
  async info(user: IUserPayload, id: number) {
    const queryBuilder = this.certificateRepository
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.dnsServer', 'cs')
      .leftJoinAndSelect('cs.provider', 'csp');
    const info = await queryBuilder
      .where('c.id = :id and c.userId = :userId', {
        id: id,
        userId: user.id,
      })
      .select('c')
      .addSelect([
        'cs.id',
        'cs.name',
        'cs.alias',
        'csp.name as providerName',
        'csp.logo as providerLogo',
      ])
      .getOne();
    if (info) {
      // 加载关联
      info['associatedClouds'] =
        (await this.cloudService.loadAssociatedForCertificate(info)) || [];
      return info;
    }
    throw new BadRequestException('证书不存在');
  }

  /**
   * 更新证书信息
   * @param user
   * @param id
   * @param data
   * @returns
   */
  async update(
    user: IUserPayload,
    id: number,
    data: UpdateCertificateDto & ConfigCertificateDto,
  ) {
    const info = await this.info(user, id);
    if (info) {
      const updateEntity = plainToInstance(CertificateEntity, data, {
        excludeExtraneousValues: true,
      });
      await this.certificateRepository.update(info.id, updateEntity);
      // 处理关联信息
      if (data?.associatedCloudIds && data?.associatedCloudIds.length > 0) {
        try {
          return await this.cloudService.updateAssociatedForCertificate(
            info,
            data.associatedCloudIds,
          );
        } catch (err) {
          // 这里不做提示了，都直接成功吧
          this.logger.error('关联更新错误 err:' + err.message);
        }
      }
      return info;
    }
    throw new BadRequestException('证书不存在');
  }

  /**
   * 删除证书
   * @param user
   * @param id
   */
  async delete(user: IUserPayload, id: number) {
    const info = await this.certificateRepository.findOneBy({
      userId: user.id,
      id,
    });
    if (info) {
      // TODO startTransaction
      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();
      try {
        // 证书版本id列表
        const certificateVersionIds = await this.certificateVersionRepository
          .find({
            where: {
              certificateId: info.id,
            },
            select: ['id'],
          })
          .then((record) => record.map((result) => result.id));
        // 1.删除证书 detail
        await queryRunner.manager.delete(CertificateDetailEntity, {
          certificateVersionId: In(_.uniq(certificateVersionIds)),
        });
        // 2.删除证书 version
        await queryRunner.manager.delete(CertificateVersionEntity, {
          certificateId: info.id,
        });
        // 3.删除证书 account
        await queryRunner.manager.delete(CertificateAccountEntity, {
          certificateId: info.id,
        });
        // 4.删除证书
        await queryRunner.manager.delete(CertificateEntity, { id: info.id });
        // commitTransaction
        await queryRunner.commitTransaction();
        return info;
      } catch (err) {
        // rollbackTransaction
        await queryRunner.rollbackTransaction();
        this.logger.error('delete certificate err:' + err.message);
        throw new BadRequestException('数据异常，请稍后再试');
      } finally {
        // 释放
        await queryRunner.release();
      }
    }
    throw new BadRequestException('证书不存在');
  }

  /**
   * 查询全证书版本列表
   * @param user
   * @param query
   * @returns
   */
  async listVersion(user: IUserPayload, query: QueueCertificateVersionDto) {
    // 提取参数
    const { keyword, pageNum = 1, pageSize = 10, sortBy, sortOrder } = query;
    // createQueryBuilder
    const queryBuilder = this.certificateVersionRepository
      .createQueryBuilder('cv')
      .leftJoinAndSelect('cv.certificate', 'c')
      .where('c.user_id = :userId', {
        userId: user.id,
      })
      .select('cv')
      .addSelect(['c.id', 'c.name', 'c.alias', 'c.type', 'c.domains']);

    // 关键词筛选
    if (keyword) {
      queryBuilder.andWhere(
        `c.name LIKE :keyword or c.alias LIKE :keyword or c.domains LIKE :keyword`,
        {
          keyword: `%${keyword}%`,
        },
      );
    }
    // 排序筛选
    if (sortBy && sortOrder) {
      queryBuilder.addOrderBy(`cv.${sortBy}`, sortOrder);
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
   * 查询单证书版本列表
   * @param user
   * @param certificateId
   * @param query
   * @returns
   */
  async listCertVersion(
    user: IUserPayload,
    certificateId: number,
    query: QueueCertificateVersionDto,
  ) {
    // 提取参数
    const { pageNum = 1, pageSize = 10, sortBy, sortOrder } = query;
    // createQueryBuilder
    const queryBuilder = this.certificateVersionRepository
      .createQueryBuilder('cv')
      .innerJoin(CertificateEntity, 'c', 'cv.certificate_id = c.id')
      .where('cv.certificate_id = :certificateId and c.user_id = :userId', {
        certificateId,
        userId: user.id,
      })
      .select();
    // 排序筛选
    if (sortBy && sortOrder) {
      queryBuilder.addOrderBy(`cv.${sortBy}`, sortOrder);
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
   * 列取关联数据表
   * @param user
   * @param certificateId
   * @param query
   */
  async listCloud(
    user: IUserPayload,
    certificateId: number,
    query: QueueCertificateVersionDto,
  ) {
    return await this.cloudService.loadAssociatedForCertificate(
      { id: certificateId },
      true,
      query,
    );
  }

  /**
   * 提交证书部署
   * @param user
   * @param certificateId
   * @param query
   */
  async deploy(
    user: IUserPayload,
    certificateId: number,
    query: DeployCertificateDto,
  ) {
    // 获取证书信息和cloud信息
    // 1.构建部署记录
    // 2.推送部署队列
    return await this.cloudService.actionDeploy(
      user,
      certificateId,
      query.associatedCloudIds,
    );
  }

  /**
   * 自动部署
   * @param user
   * @param certificateId
   */
  async autoDeploy(user: IUserPayload, certificateId: number) {
    // 1.列出关联的云资源
    const associatedCloud: any =
      await this.cloudService.loadAssociatedForCertificate(
        { id: certificateId },
        false,
      );
    if (associatedCloud?.length) {
      // 部署处理
      return await this.cloudService.actionDeploy(
        user,
        certificateId,
        associatedCloud.map((cloud: any) => cloud.id),
        'automatic',
      );
    }
  }

  /**
   * 证书全部署列表
   * @param user
   * @param query
   */
  async listDeploy(user: IUserPayload, query: QueueCertificateVersionDto) {
    return await this.cloudService.certificateDeployList(user, null, query);
  }

  /**
   * 证书单部署列表
   * @param user
   * @param certificateId
   * @param query
   */
  async listCertDeploy(
    user: IUserPayload,
    certificateId: number,
    query: QueueCertificateVersionDto,
  ) {
    return await this.cloudService.certificateDeployList(
      user,
      certificateId,
      query,
    );
  }

  /**
   * 创建新版本
   * @param user
   * @param id
   * @param triggerType
   */
  async createVersion(user: IUserPayload, id: number, triggerType = 'manual') {
    const certificate = await this.info(user, id);
    if (certificate) {
      // 扣费前置检查
      await this.billingService.preCheckUserCoin(user);
      // 创建证书版本
      const certificateVersionRepo = this.certificateVersionRepository.create({
        certificateId: certificate.id,
        status: 1,
      });
      const certificateVersion = await this.certificateVersionRepository.save(
        certificateVersionRepo,
      );
      // 更新最新版本
      certificate.latestVersionId = certificateVersion.id;
      await this.updateCertificateById(certificate.id, {
        latestVersionId: certificateVersion.id,
      });
      // 队列执行证书申请操作
      await this.certificateQueue.add(
        'acme-order',
        {
          user,
          certificate,
          certificateVersion,
          update: true,
          triggerType,
        },
        {
          delay: 5e3,
          attempts: 5,
          removeOnComplete: true,
          removeOnFail: true,
        },
      );
      return certificateVersion;
    }
    throw new BadRequestException('数据异常，请稍后尝试');
  }

  /**
   * 获取版本信息
   * @param user
   * @param id
   * @param vid
   */
  async versionInfo(user: IUserPayload, id: number, vid: number) {
    const info = await this.info(user, id);
    if (info) {
      //
      const queryBuilder = this.certificateVersionRepository
        .createQueryBuilder('cv')
        .leftJoinAndSelect('cv.certificate', 'c')
        .leftJoinAndSelect('cv.detail', 'd');
      const version = await queryBuilder
        .where('cv.id = :id and cv.certificate_id = :certificateId', {
          id: vid,
          certificateId: id,
        })
        .select('cv')
        .addSelect([
          'c.name',
          'c.alias',
          'c.domains',
          'd.subject',
          'd.subjectaltname',
          'd.issuer',
          'd.serialNumber',
          'd.fingerprint',
          'd.fingerprint256',
          'd.validFrom',
          'd.validTo',
          'd.key',
          'd.certificate',
          'd.certificate',
        ])
        .getOne();
      // 读取证书信息
      const acmePath = this.configService.get<string>('acme.acme_path');
      const certificatePath = this.configService.get<string>(
        'acme.certificate_path',
      );
      const commonCertPath = path.join(
        path.dirname(__dirname),
        acmePath,
        certificatePath,
        `${info.name}` || `unkown-${Date.now()}`,
        `version-${version.id}`,
      );
      // 如果没有serialNumber 且 存在证书文件，读取文件进行更新
      if (
        (!version.detail?.serialNumber || !version.detail?.key) &&
        fs.existsSync(commonCertPath)
      ) {
        // 读取文件
        const [keyPem, certPem] = await Promise.all(
          ['key.pem', 'cert.pem'].map(async (name) => {
            return fs.readFileSync(
              path.join(commonCertPath, '/', name),
              'utf-8',
            );
          }),
        );
        const certInfo = readCertificateInfo(certPem);
        await this.createCertificateDetail(version.id, {
          ...certInfo,
          validFrom: certInfo.valid_from,
          validTo: certInfo.valid_to,
          key: keyPem.toString(),
          certificate: certPem.toString(),
        });
      }
      return version;
    }
    throw new BadRequestException('数据异常，请稍后尝试');
  }

  /**
   * 吊销证书版本
   * @param user
   * @param id
   * @param vid
   */
  async versionRevoke(user: IUserPayload, id: number, vid: number) {
    // 获取证书
    const certificate = await this.certificateRepository.findOneBy({ id });
    if (!certificate)
      throw new BadRequestException('你的证书数据有误，请检查输入参数是否正确');
    // 获取证书账户
    const clientOptions = await this.getCertificateAcmeAccount(certificate);
    const { client, account } = await this.acmeService.createAcmeClient(
      user,
      clientOptions,
    );
    // 获取证书数据
    const certificateDetail = await this.certificateDetailRepository.findOneBy({
      certificateVersionId: vid,
    });
    // 证书详情存在才可以吊销证书
    if (certificateDetail) {
      // 吊销证书
      try {
        await this.acmeService.revokeCertificate(
          client,
          certificateDetail.certificate,
        );
      } catch (err) {
        this.logger.error('revokeCertificate', err.message);
      }
      // 使用 ocsp 检查证书是否吊销
      const { status, revocationTime } = await getCertStatus(
        certificateDetail.certificate,
      );
      this.logger.debug('getCertStatus', status, revocationTime);
      // 更新版本数据
      // 查找最新可用的validId
      const latestValidVersion =
        await this.certificateVersionRepository.findOne({
          where: {
            certificateId: certificate.id,
            status: 2,
            revokedTime: IsNull(),
          },
          order: {
            createTime: 'DESC',
          },
        });
      this.logger.debug('latestValidVersion', latestValidVersion);
      // 更新证书状态和激活id
      await this.updateCertificateById(certificate.id, {
        latestVersionId: latestValidVersion.id,
        latestValidVersionId: latestValidVersion.id,
      });
      // 更新证书版本信息
      await this.updateCertificateVersion(
        certificate.id,
        {
          revokedTime: revocationTime
            ? dayjs(revocationTime).format('YYYY-MM-DD HH:mm:ss')
            : null,
          status: status.toUpperCase() === 'REVOKED' ? 4 : 2,
        },
        certificateDetail.certificateVersionId,
      );
    }

    return certificate;
  }

  /**
   * 下站版本证书
   * @param user
   * @param id
   * @param vid
   */
  async versionDownload(user: IUserPayload, id: number, vid: number) {
    const info = await this.info(user, id);
    if (info) {
      // TODO 压缩文件
      const fileName = `${info.name}_${Date.now()}.zip`;
      // 读取证书信息
      const acmePath = this.configService.get<string>('acme.acme_path');
      const certificatePath = this.configService.get<string>(
        'acme.certificate_path',
      );
      const commonCertPath = path.join(
        acmePath,
        certificatePath,
        `${info.name}` || `unkown-${Date.now()}`,
      );
      // 如果不存在才创建，存在直接返回
      const archiverConn = await Promise.all(
        [
          { file: 'csr.pem', name: 'cert.csr' },
          { file: 'key.pem', name: 'cert.key' },
          { file: 'cert.pem', name: 'fullchain.pem' },
        ].map(async (cert) => {
          return {
            name: cert.name,
            content: fs.readFileSync(
              path.join(
                commonCertPath,
                `version-${vid || info.latestVersionId}`,
                cert.file,
              ),
            ),
          };
        }),
      );

      // 压缩文件
      await archiverContent(archiverConn, commonCertPath, fileName);
      return {
        certArchiverFile: path.join(commonCertPath, fileName),
        fileName,
      };
    }
    throw new BadRequestException('证书数据异常，请重新申请');
  }

  /**
   * 通过id获取证书信息
   * @param certificateId
   */
  async getCertificateInfoById(certificateId: number) {
    return await this.certificateRepository.findOneBy({
      id: certificateId,
    });
  }

  /**
   * 更新证书信息 - ById
   * @param certificateId
   * @param data
   */
  async updateCertificateById(certificateId: number, data: CertificateInfoDto) {
    const info = await this.certificateRepository.findOneBy({
      id: certificateId,
    });
    if (info) {
      const updateEntity = plainToInstance(CertificateEntity, data, {
        excludeExtraneousValues: true,
      });
      this.logger.debug('updateEntity');
      this.logger.debug(updateEntity.toString());
      await this.certificateRepository.update(info.id, updateEntity);
      return info;
    }
    throw new BadRequestException('证书信息找不到');
  }

  /**
   * 更新版本数据
   * @param certificateId
   * @param data
   * @param versionId
   * @param triggerType
   */
  async updateCertificateVersion(
    certificateId: number,
    data: CertificateVersionInfoDto,
    versionId?: number,
    triggerType = 'manual',
  ) {
    const certificationInfo = await this.certificateRepository.findOneBy({
      id: certificateId,
    });
    if (certificationInfo) {
      // 查找最新版本
      const versionInfo = await this.certificateVersionRepository.findOneBy({
        id: versionId || certificationInfo.latestValidVersionId,
      });
      const updateVersionEntity = plainToInstance(
        CertificateVersionEntity,
        data,
        {
          excludeExtraneousValues: true,
        },
      );
      this.logger.debug('updateVersionEntity');
      this.logger.debug(updateVersionEntity.toString());
      await this.certificateVersionRepository.update(
        versionInfo.id,
        updateVersionEntity,
      );
      // TODO 消费 手动更新证书
      await this.billingService.triggerBilling(
        certificationInfo.userId,
        'certificate',
        'update',
        triggerType,
      );
      return certificationInfo;
    }
    throw new BadRequestException('证书信息找不到');
  }

  /**
   * 写入证书信息
   * @param certificateVersionId
   * @param data
   */
  async createCertificateDetail(certificateVersionId: number, data: any) {
    const existing = await this.certificateDetailRepository.findOneBy({
      certificateVersionId,
    });
    if (existing) {
      const plainRepo = plainToInstance(CertificateDetailEntity, data, {
        excludeExtraneousValues: true,
      });
      // 更新已有记录
      return await this.certificateDetailRepository.update(
        existing.id,
        plainRepo,
      );
    }
    const repo = this.certificateDetailRepository.create({
      certificateVersionId,
      ...data,
    });
    return await this.certificateDetailRepository.save(repo);
  }

  /**
   * 构建记录证书的acme account
   * @param certificate
   * @param account
   */
  async createCertificateAcmeAccount(
    certificate: any,
    account: acme.ClientOptions,
  ) {
    // 读取证书acme账户
    const certificateAccount =
      await this.certificateAccountRepository.findOneBy({
        certificateId: certificate.id,
      });
    if (!certificateAccount) {
      const certificateAccountRepo = this.certificateAccountRepository.create({
        certificateId: certificate.id,
        directory: account.directoryUrl,
        url: account.accountUrl,
        key: account.accountKey.toString(),
      });
      return await this.certificateAccountRepository.save(
        certificateAccountRepo,
      );
    } else {
      // 更新url和key
      return await this.certificateAccountRepository.update(
        certificateAccount.id,
        {
          directory: account.directoryUrl,
          url: account.accountUrl,
          key: account.accountKey.toString(),
        },
      );
    }
  }

  /**
   * 获取证书的account
   * @param certificate
   */
  async getCertificateAcmeAccount(
    certificate: any,
  ): Promise<acme.ClientOptions | null> {
    // 读取证书acme账户
    const certificateAccount =
      await this.certificateAccountRepository.findOneBy({
        certificateId: certificate.id,
      });
    if (!certificateAccount) {
      return null;
    }
    return {
      directoryUrl: certificateAccount.directory || '',
      accountUrl: certificateAccount.url || '',
      accountKey: certificateAccount.key || '',
    };
  }

  /**
   * 获取30天内即将过期的的证书
   */
  async getCertificatesExpiringSoon() {
    return await this.certificateRepository
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.latestValidVersion', 'cv')
      .where(
        'c.status = :status and DATEDIFF(cv.expiredTime, CURDATE()) <= :expiredDays',
        {
          status: 2, // 颁发的
          expiredDays: 30,
        },
      )
      .select([
        'c.id as id',
        'c.user_id as userId',
        'c.domains as domains',
        'c.auto_notify as autoNotify',
        'c.notify_days_in_advance as notifyDaysInAdvance',
        'c.auto_update as autoUpdate',
        'c.update_days_in_advance as updateDaysInAdvance',
        'COALESCE(c.alias, c.name) as name',
        'cv.expiredTime as expiredTime',
        'cv.status as latestVersionStatus',
      ])
      .getRawMany();
  }
}
