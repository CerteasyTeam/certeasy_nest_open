import {
  Injectable,
  Inject,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import * as dns from 'dns';
import * as _ from 'lodash';
// @app/utils
import { extractDomainWithPrefix, retryFuncWithDelay } from '@app/utils';
// @app/modules/services
import { CertificateService } from '@app/modules/certificate/certificate.service';
import { CloudService } from '@app/modules/cloud/cloud.service';
import { DnsService } from '@app/modules/dns/dns.service';
import { WatchService } from '@app/modules/watch/watch.service';
// dtos
import { ModeActionCheckDto } from './dtos';
import { BillingService } from '@app/share';

@Injectable()
export class CommonService {
  // logger
  readonly logger = new Logger(CommonService.name);

  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    private readonly billingService: BillingService,
    // 统计
    private readonly certificateService: CertificateService,
    private readonly cloudService: CloudService,
    private readonly dnsService: DnsService,
    private readonly watchService: WatchService,
  ) {}

  /**
   * 加载配置
   */
  async loadConfig() {
    const invitationActivateCoins = this.configService.get<number>(
      'invitation.activate_coins',
      1000,
    );
    const invitationRechargeRewardRate = this.configService.get<number>(
      'invitation.recharge_reward_rate',
      10,
    );
    const appDomain = this.configService.get('app.domain');
    return {
      appDomain,
      billingConfig: this.billingService.getConfig(),
      customerService: {
        qrcode: 'https://cdn.certeasy.cn/wechat-contact.jpg',
        wechat: 'zuxcloud',
        qq: '702154416',
        email: 'zuxing.xu@lettered.cn',
      },
      // 激励
      invitationActivateCoins,
      invitationRechargeRewardRate,
      invitationRechargeRewardCoins: Math.floor(
        invitationActivateCoins * (invitationRechargeRewardRate / 100),
      ),
      aliasCnameValue: `_acme-challenge.${appDomain}`,
    };
  }

  /**
   * 前置校验
   * @param user
   * @param mode
   * @param action
   * @param data
   */
  async modeActionCheck(
    user: IUserPayload,
    mode: string,
    action: string,
    data: ModeActionCheckDto,
  ) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    const validation: [{ error: string | null; result?: any }] =
      await retryFuncWithDelay(
        async () => {
          if (mode === 'http') {
            const httpErrorMsg = `HTTP验证链接[domain]服务端代理配置不正确，请确认配置正确并可通过互联网访问后重试`;
            const userAgent = this.configService.get<string>('acme.user_agent');
            return await Promise.all(
              data.domains.map(async (domain) => {
                // 验证资源 `http://${identifier.value}/.well-known/acme-challenge/${challenge.token}`
                return new Promise(async (resolve) => {
                  try {
                    const uri = `http://${domain}/.well-known/acme-challenge/certeasy-${user.userCode}`;
                    this.logger.debug('http resolve url:' + uri);
                    const { data: respData } = await this.httpService
                      .get(uri, {
                        headers: {
                          'User-Agent': userAgent,
                        },
                      })
                      .toPromise();
                    this.logger.log('respData', respData.detail);
                    // 比对校验
                    if (respData && respData.success === true) {
                      return resolve({
                        error: null,
                        result: respData.success,
                      });
                    }
                    this.logger.error('http resolve err:' + respData.message);
                    return resolve({
                      error:
                        respData.error ||
                        httpErrorMsg.replace(
                          'domain',
                          `http://${domain}/.well-known/acme-challenge`,
                        ),
                    });
                  } catch (err) {
                    this.logger.error('http resolve err:' + err.message);
                    return resolve({
                      error: httpErrorMsg.replace(
                        'domain',
                        `http://${domain}/.well-known/acme-challenge`,
                      ),
                    });
                  }
                });
              }),
            );
          } else {
            return await Promise.all(
              data.domains.map(async (domain) => {
                return new Promise((resolve) => {
                  // 拆解域名和前缀
                  const { domain: domainRoot, prefix: domainPrefix } =
                    extractDomainWithPrefix(domain, true);
                  // 拼接hostname
                  const hostname = ['_acme-challenge', domainPrefix, domainRoot]
                    .filter((_) => _.trim())
                    .join('.');
                  this.logger.debug('dns resolve hostname:' + hostname);
                  dns.resolve(
                    hostname,
                    action === 'cname' ? 'CNAME' : 'TXT',
                    (err: any, records: any[]) => {
                      if (err) {
                        this.logger.error('dns resolve err:' + err.message);
                        return resolve({
                          error: `[${hostname}]解析记录无法校验，请添加相关CNAME类型解析记录后重试，如已添加，请等待解析记录生效后重试，生效时间一般需要约3～5分钟`,
                        });
                      }
                      // TXT RECORDS
                      /*
                       [
                        [ '0ijvAPn5pXzSyojojceYVoxJ8WKHiYD6dPcqhbyBEQ0' ],
                        [ 'Y_7SRAmgskSJMxZe11idB4f6vIUhEJfzkmyOUE1rOb8' ]
                       ]
                       CNAME RECORDS
                       [ '_acme-challenge.7ebe18a7e92a8aaa.certeasy.cn' ]
                      */
                      this.logger.debug('dns.resolve.records', records);
                      // TODO 目前这里只做了CNAME一个判断，后续有需求在做其他吧
                      const validCname = `_acme-challenge.${user.userCode}.certeasy.cn`;
                      const validation = _.flatten(records).some(
                        (value: string) => value === validCname,
                      );
                      return resolve({
                        error: validation
                          ? ''
                          : `查询到解析记录[${hostname}]的CNAME记录不正确，请更正为[${validCname}]后再重试，如已添加，请等待解析记录生效后重试，生效时间一般需要约3～5分钟`,
                        result: validation,
                      });
                    },
                  );
                });
              }),
            );
          }
        },
        2,
        500,
      );

    this.logger.log(`${mode} validation`, validation);
    // 如果都没有error
    if (validation.some((valid) => valid.error)) {
      throw new BadRequestException(
        validation.find((valid) => valid.error != null)?.error,
      );
    }
    return validation;
  }

  async dataOverview(user: IUserPayload) {
    // 证书（总量、生效、到期）
    const certificate = await this.certificateService.loadOverview(user);
    // 部署（总次、成功、失败）
    const deploy = await this.cloudService.loadDeployOverview(user);
    // 云资源（数量）
    const cloud = await this.cloudService.loadOverview(user);
    // dns（数量）
    const dns = await this.dnsService.loadOverview(user);
    // 监控（总数、正常、异常）
    const watch = await this.watchService.loadOverview(user);
    return {
      certificate,
      deploy,
      cloud,
      dns,
      watch,
    };
  }
}
