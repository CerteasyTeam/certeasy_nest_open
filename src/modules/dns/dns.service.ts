import {
  Injectable,
  Inject,
  Logger,
  BadRequestException,
  HttpStatus,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { plainToInstance } from 'class-transformer';
// entities
import { DnsEntity, DnsProviderEntity } from './entities';
// dtos
import {
  QueryDnsDto,
  CreateDnsIDto,
  QueryDnsProviderDto,
  CheckDnsIDto,
  DnsInfoDto,
} from './dtos';
import { DnsProviderFactory, extractDomainWithPrefix } from '@app/utils';

@Injectable()
export class DnsService {
  // logger
  readonly logger = new Logger(DnsService.name);
  constructor(
    private readonly dataSource: DataSource,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
    @InjectQueue('dns')
    private dnsQueue: Queue,
    @InjectRepository(DnsEntity)
    private readonly dnsRepository: Repository<DnsEntity>,
    @InjectRepository(DnsProviderEntity)
    private readonly dnsProviderRepository: Repository<DnsProviderEntity>,
  ) {}

  /**
   * dns总览
   * @param user
   */
  async loadOverview(user: IUserPayload) {
    const where = { userId: user.id };
    return {
      totalCount: await this.dnsRepository.count({ where }),
    };
  }

  /**
   * 授权provider
   * @param user
   * @param query
   */
  async provider(user: IUserPayload, query: QueryDnsProviderDto) {
    const {
      pageNum = 1,
      pageSize = 10,
      sortBy = 'createTime',
      sortOrder = 'DESC',
    } = query;
    // createQueryBuilder
    const queryBuilder = this.dnsProviderRepository
      .createQueryBuilder('dp')
      .where('dp.status = :status', { status: 1 })
      .select('dp');
    // 排序筛选
    if (sortBy && sortOrder) {
      queryBuilder.addOrderBy(`dp.${sortBy}`, sortOrder);
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
   * 监控数据列表
   * @param user
   * @param query
   */
  async list(user: IUserPayload, query: QueryDnsDto) {
    // 提取参数
    const { keyword, pageNum = 1, pageSize = 10, sortBy, sortOrder } = query;
    // createQueryBuilder
    const queryBuilder = this.dnsRepository
      .createQueryBuilder('d')
      .innerJoinAndSelect(DnsProviderEntity, 'dp', 'dp.id = d.provider_id')
      .where('d.user_id = :userId', { userId: user.id })
      .loadRelationCountAndMap('d.certificatesCount', 'd.certificates')
      .select('d')
      .addSelect(['dp.name as d_providerName', 'dp.logo as d_providerLogo']);

    // 关键词筛选
    if (keyword) {
      queryBuilder.andWhere(`d.name LIKE :keyword or d.alias LIKE :keyword`, {
        keyword: `%${keyword}%`,
      });
    }
    // 排序筛选
    if (sortBy && sortOrder) {
      queryBuilder.addOrderBy(`d.${sortBy}`, sortOrder);
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
   * 获取详情数据
   * @param user
   * @param data
   */
  async create(user: IUserPayload, data: CreateDnsIDto) {
    const { accessJson } = data;
    // TODO 必要校验accessJson 是否正确
    const { configJson } = await this.getDnsProviderInfo(data.providerId);
    // 解构取得值数据
    const [accessKey, accessSecret] = Object.values(accessJson);
    // 校验
    await this.#preCheckDnsConfig(configJson?.name, accessKey, accessSecret);
    try {
      const dnsRepo = this.dnsRepository.create({
        userId: user.id,
        ...data,
        accessJson,
      });
      // return dnsRepo;
      const dns = await this.dnsRepository.save(dnsRepo);
      this.logger.debug('watch completed:' + JSON.stringify(dns));
      // 返回详情
      return await this.info(user, dns.id);
    } catch (err) {
      this.logger.error('create dns err: ' + err.message);
      throw new BadRequestException('新增dns授权错误');
    }
  }

  /**
   * 获取详情
   * @param user
   * @param id
   */
  async info(user: IUserPayload, id: number) {
    // const info = await this.dnsRepository.findOne({
    //   where: {
    //     userId: user.id,
    //     id,
    //   },
    //   relations: ['certificates'],
    //   select: {
    //     certificates: {
    //       id: true,
    //       name: true,
    //       alias: true,
    //     },
    //   },
    // });
    const queryBuilder = this.dnsRepository
      .createQueryBuilder('d')
      .leftJoinAndSelect('d.provider', 'dp')
      .leftJoinAndSelect('d.certificates', 'c')
      .where('d.user_id = :userId and d.id = :id', { userId: user.id, id })
      .select('d')
      .loadRelationCountAndMap('d.certificatesCount', 'd.certificates')
      .addSelect(['c.id', 'c.name', 'c.alias'])
      .addSelect([
        'dp.name as d_providerName',
        'dp.logo as d_providerLogo',
        'dp.configJson as d_providerConfigJson',
      ]);
    const info = await queryBuilder.getOne();
    if (info) return info;
    throw new BadRequestException('未找到DNS授权数据');
  }

  /**
   * DNS前置检查
   * @param providerName
   * @param accessKey
   * @param accessSecret
   * @private
   */
  async #preCheckDnsConfig(providerName, accessKey, accessSecret) {
    // 取得provider
    // DnsProviderFactory
    const providerFactory = DnsProviderFactory.createProvider(
      providerName,
      accessKey,
      accessSecret,
    );
    try {
      // 校验是否ak/sk可以请求数据
      return await providerFactory.checkDns();
    } catch (err) {
      this.logger.error('checkDns err:' + err.message);
      // 抛出异常
      throw new BadRequestException(
        'DNS授权检查错误，请您检查配置密钥是否授权',
      );
    }
  }

  /**
   * 获取dns配置
   * @param id
   */
  async getDnsInfo(id: number) {
    // TODO 根据provide进行数据请求
    const dnsInfo = await this.dnsRepository.findOneBy({
      id,
    });
    if (dnsInfo) {
      return dnsInfo;
    }
    throw new BadRequestException('DNS配置数据不存在');
  }

  /**
   * 更新dns授权配置
   * @param user
   * @param id
   * @param data
   */
  async update(user: IUserPayload, id: number, data: DnsInfoDto) {
    const info = await this.dnsRepository.findOneBy({
      userId: user.id,
      id,
    });
    if (info) {
      // TODO 必要校验accessJson 是否正确，走第三方接口
      const { configJson } = await this.getDnsProviderInfo(info.providerId);
      // 解构取得值数据
      const [accessKey, accessSecret] = Object.values(info.accessJson);
      // 校验
      await this.#preCheckDnsConfig(configJson?.name, accessKey, accessSecret);
      // 更新
      const updateEntity = plainToInstance(DnsEntity, data, {
        excludeExtraneousValues: true,
      });
      console.log('updateEntity', updateEntity);
      return await this.dnsRepository.update(info.id, updateEntity);
    }
    throw new BadRequestException('未找到该DNS授权数据');
  }

  /**
   * 删除dns授权
   * @param user
   * @param id
   */
  async delete(user: IUserPayload, id: number) {
    const queryBuilder = this.dnsRepository
      .createQueryBuilder('d')
      .leftJoinAndSelect('d.provider', 'dp')
      .where('d.user_id = :userId and d.id = :id', {
        userId: user.id,
        id,
      })
      .loadRelationCountAndMap('d.certificatesCount', 'd.certificates')
      .select('d');
    // 查询
    const info = await queryBuilder.getOne();
    if (info) {
      // 检查存在证书
      if (info?.certificatesCount && info?.certificatesCount > 0) {
        throw new BadRequestException('该DNS授权存在多个证书使用中，不能删除');
      }
      // todo 检查dns配置是否正确
      return await this.dnsRepository.delete(info.id);
    }
    throw new BadRequestException('未找到该DNS授权数据');
  }

  /**
   * 获取provider
   * @param id
   */
  async getDnsProviderInfo(id: number) {
    // TODO 根据provide进行数据请求
    const providerInfo = await this.dnsProviderRepository.findOneBy({
      id,
    });
    if (providerInfo) {
      return providerInfo;
    }
    throw new BadRequestException('DNS服务商数据不存在');
  }
  /**
   * 校验信息
   * @param user
   * @param data
   */
  async check(user: IUserPayload, data: CheckDnsIDto) {
    // 处理accessJson数据
    const { accessJson, domains, providerServerId, providerId } = data;
    let providerName = null;
    let accessKey = null;
    let accessSecret = null;
    // TODO 根据provide进行数据请求
    if (providerServerId) {
      const dnsInfo = await this.getDnsInfo(providerServerId);
      // TODO 必要校验accessJson 是否正确，走第三方接口
      const { configJson } = await this.getDnsProviderInfo(dnsInfo.providerId);
      // 解构取得值数据
      [accessKey, accessSecret] = Object.values(dnsInfo.accessJson);
      providerName = configJson?.name;
    } else {
      // 用户直传
      const { configJson } = await this.getDnsProviderInfo(providerId);
      const mergeAccessJson = configJson?.fields.reduce(
        (acc: any, cur: any) => {
          acc[cur.field] = accessJson[cur.field];
          return acc;
        },
        {},
      );
      // 解构取得值数据
      [accessKey, accessSecret] = Object.values(mergeAccessJson);
      providerName = configJson?.name;
    }

    // 取得provider
    // DnsProviderFactory
    const factory = DnsProviderFactory.createProvider(
      providerName,
      accessKey,
      accessSecret,
    );
    // 域名即使是多个，都是同一个根域名，只需要查询一次
    const [mainDomain] = domains;
    // 处理主域名
    const { domain, prefix } = extractDomainWithPrefix(mainDomain, true);
    // 解析记录
    const parseDomainsPrefix = domains.map((domain) => {
      const { prefix } = extractDomainWithPrefix(domain, true);
      return `_acme-challenge${prefix ? `.${prefix}` : ''}`;
    });

    const checkRR = `_acme-challenge${prefix ? `.${prefix}` : ''}`;
    try {
      this.logger.debug(`dns resolve hostname: ${domain}, RR: ${checkRR}`);
      const domainRecords = await factory.checkDomainDnsRecord(domain, {
        type: 'TXT',
        RR: checkRR,
      });
      // 记录排查
      if (domainRecords) {
        // 检查是否残留
        const domainRecord = domainRecords!.find((record: any) =>
          parseDomainsPrefix.includes(record.RR),
        );
        // 如果不等于
        if (domainRecord) {
          return {
            error: domainRecord
              ? `您的DNS域名解析记录中存在主机记录为【${domainRecord.RR}.${domainRecord.domainName}】的${domainRecord.type}类型解析记录，会影响域名所有权的验证，请删除相关CNAME类型解析记录后重试，如已删除，请等待解析记录失效后重试，失效时间一般需要约3～10分钟`
              : null,
            result: false,
          };
        }
      }
      return {
        error: null,
        result: true,
      };
    } catch (err) {
      this.logger.error('err:' + err.message);
      return {
        error: 'DNS授权配置信息有误，请您检查配置数据后重新验证',
        result: false,
      };
    }
  }
}
