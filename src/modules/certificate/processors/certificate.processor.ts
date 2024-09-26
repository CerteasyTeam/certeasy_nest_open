import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Processor,
  Process,
  InjectQueue,
  OnQueueActive,
  OnQueueCompleted,
  OnQueueFailed,
} from '@nestjs/bull';
import { Job, Queue } from 'bull';
import { HttpService } from '@nestjs/axios';
// acme
import * as acme from 'acme-client';
import * as rfc8555 from 'acme-client/types/rfc8555';
import { CertificateService } from '../certificate.service';
import * as path from 'path';
import * as fs from 'fs';
import * as dns from 'dns';
// 设置dns服务器
dns.setServers([
  '8.8.8.8',
  '8.8.4.4',
  '114.114.114.114',
  '114.114.114.115',
  '223.5.5.5',
  '223.6.6.6',
  '119.29.29.29',
  '180.76.76.76',
]);
import * as dayjs from 'dayjs';
// utils
import {
  extractDomainWithPrefix,
  DnsProviderFactory,
  IDnsProvider,
  asleep,
  retryFuncWithDelay,
  readCertificateInfo,
} from '@app/utils';
// acme.module
import { AcmeService } from '@app/share/acme/acme.service';
import { AcmeClientLogger } from '@app/share/acme/loggers';
import { CERTIFICATE_AUTH_MODE, DATE_FORMAT } from '@app/common';
// dns modules
import { DnsService } from '@app/modules/dns/dns.service';
// notification
import { NotificationService } from '@app/modules/notification/notification.service';
/**
 * IChallengeWithKeyAuthorization
 */
interface IChallengeWithKeyAuthorization extends rfc8555.ChallengeAbstract {
  token: string;
  keyAuthorization?: string;
}

/**
 * 证书生成处理器
 * 1.下单
 * 2.dns或者文件验证
 * 3.acme验证
 * 4.下载证书
 */
@Processor('certificate')
export class CertificateProcessor {
  private readonly logger = new Logger(CertificateProcessor.name);
  /**
   * acme客户端
   */
  private acmeClient: Map<string, acme.Client> = new Map<string, acme.Client>();
  /**
   * acme 客户端配置
   * @private
   */
  private acmeClientOptions: Map<string, acme.ClientOptions> = new Map<
    string,
    acme.ClientOptions
  >();
  /**
   * factory
   */
  private dnsFactory: Map<string, IDnsProvider> = new Map<
    string,
    IDnsProvider
  >();

  /**
   * 操作的DNS数据记录
   * @private
   */
  private dnsFactoryRR: Map<string, any[]> = new Map<string, []>();
  /**
   * 关闭队列id
   * @private
   */
  private acmeCloseJobId: Map<string, number | string> = new Map<string, 0>();

  // 错误信息，用于写入记录
  private error: Map<string, any> = new Map<string, ''>();

  // 记录是否更新证书流程
  private update: Map<string, any> = new Map<string, ''>();

  // 记录触发类型
  private triggerType: Map<string, any> = new Map<string, ''>();

  constructor(
    @InjectQueue('certificate')
    private certificateQueue: Queue,
    private readonly notificationService: NotificationService,
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    private readonly acmeService: AcmeService,
    private readonly dnsService: DnsService,
    private readonly certificateService: CertificateService,
    private readonly acmeClientLogger: AcmeClientLogger,
  ) {}

  @OnQueueActive()
  async handleQueueActive(job: Job) {
    this.logger.debug(`============       OnQueueActive      ============`);
    this.logger.debug(
      `active ${job.name}: ${dayjs().format('YYYY-MM-DD HH:mm:ss')}`,
    );
  }

  @OnQueueCompleted()
  async handleQueueCompleted(job: Job) {
    this.logger.debug(
      `completed ${job.name}: ${dayjs().format('YYYY-MM-DD HH:mm:ss')}`,
    );
    this.logger.debug(`============    OnQueueCompleted   ================`);
  }

  @OnQueueFailed()
  async handleQueueFailed(job: Job) {
    this.logger.debug('===========   handleQueueFailed  start  ===========');
    const attemptsMade = job.attemptsMade;
    const maxAttempts = job.opts.attempts;
    if (attemptsMade === maxAttempts) {
      const { certificate } = job.data;
      console.log('This was the last attempt, and it failed.');
      await this.updateCertificateJobInError(certificate);
      // 删除job
      await job.remove();
    }
    this.logger.debug('===========   handleQueueFailed  end  ===========');
  }

  /**
   * 获取证书 acme客户端
   * @param user
   * @param certificate
   * @private
   */
  private async getCertificateAcmeClient(user: any, certificate: any) {
    if (!this.acmeClient.has(certificate.name)) {
      let clientOptions = this.acmeClientOptions.get(certificate.name);
      // TODO 如果也没有，就去数据库查找对应的
      if (!clientOptions) {
        clientOptions =
          await this.certificateService.getCertificateAcmeAccount(certificate);
      }
      // 初始化acme client 第一次传入要带agency
      const { client, account } = await this.acmeService.createAcmeClient(
        user,
        clientOptions,
        certificate.certAgency,
      );
      // update account
      await this.certificateService.createCertificateAcmeAccount(
        certificate,
        account,
      );
      // 设置acme client
      this.acmeClient.set(certificate.name, client);
      this.acmeClientOptions.set(certificate.name, account);
      // 延迟 500ms
      await asleep(500);
    }
    return this.acmeClient.get(certificate.name);
  }

  /**
   * 清理客户端和配置
   * @param certificate
   * @private
   */
  private clearAcmeClient(certificate: any) {
    this.acmeClient.delete(certificate.name);
    this.acmeClientOptions.delete(certificate.name);
  }

  /**
   * 取消关闭队列
   * @param certificate
   * @param jobId
   * @private
   */
  private async removeAcmeCloseJob(certificate: any, jobId?: number | string) {
    const job = await this.certificateQueue.getJob(
      jobId || this.acmeCloseJobId.get(certificate.name),
    );
    if (job) {
      await job.remove();
    } else {
      this.logger.log('Job not found, operation ignored.');
    }
  }

  /**
   * 移记录
   * @param certificate
   * @private
   */
  private async removeDnsFactory(certificate: any) {
    // 如果是DNS 操作 则需要删除dns记录
    const factory = this.dnsFactory.get(certificate.name);
    if (factory) {
      // 取得解析设置内容
      const userRR = this.dnsFactoryRR.get(certificate.name);
      this.logger.debug('acme-completed need to delete dns record', userRR);
      await Promise.all(
        userRR.map(async (rr: any) => {
          try {
            const { recordId, domain, RR, type } = rr;
            await factory.deleteRecord(domain, { recordId, RR, type });
            this.logger.log(`delete dns ${JSON.stringify(rr)} record success`);
            // asleep 停止3s 后处理
            await asleep(3e3);
          } catch (err) {
            this.logger.debug('delete dns record err:' + err.message);
          }
        }),
      );
      // factory
      this.dnsFactory.delete(certificate.name);
    }
  }

  /**
   * asyncExecuteChallenge
   * @param auth
   * @param user
   * @param certificate
   * @private
   */
  private async asyncExecuteChallenge(auth: any, user: any, certificate: any) {
    // 加载acmeClient
    const client = await this.getCertificateAcmeClient(user, certificate);
    // 认证模式
    const { authMode } = certificate;
    // 域名处理
    let mainDomain = 'certeasy.cn';
    let RRType: 'TXT' | 'CNAME' = 'TXT';
    // 用户解析记录RR
    let userRR = `_acme-challenge.${user.userCode}`;
    // 进来这里单个域名处理
    const { challenges, identifier } = auth;
    // 取得用户选定的验证类型
    let challenge: IChallengeWithKeyAuthorization;
    let validation = false;
    // TODO 取得challenges特征 KeyAuthorization
    const challengesWithKeyAuthorization: IChallengeWithKeyAuthorization[] =
      await Promise.all(
        challenges.map(async (chall: any) => {
          const keyAuthorization =
            await this.acmeService.getChallengeKeyAuthorization(client, chall);
          return {
            ...chall,
            keyAuthorization,
          };
        }),
      );

    this.logger.debug(
      'challengesWithKeyAuthorization',
      challengesWithKeyAuthorization,
    );
    // TODO 前置校验没通过, 直接失败得了，但是按道理应该都过
    if (
      challengesWithKeyAuthorization.every(
        (chall) => chall.status === 'invalid',
      )
    ) {
      return {
        validation: false,
        error: `ACME challenge active pre validation failed: Invalid Status`,
      };
    } else {
      // TODO 如果还是待处理的，继续处理
      // 直接请求acme-challenge
      // 文件验证模式
      if (
        [
          CERTIFICATE_AUTH_MODE.HTTP_AUTH_MODE,
          CERTIFICATE_AUTH_MODE.HTTP_ALIAS_AUTH_MODE,
        ].includes(Number(authMode))
      ) {
        challenge = challengesWithKeyAuthorization.find(
          (chall) => chall.type == 'http-01',
        );
        // TODO 检查是否已经校验过了
        // pending 需要创建校验
        if (challenge.status === 'pending') {
          // 文件写入
          let fileSetupSuccessful = true;
          // 尝试写入文件
          try {
            const acmePath = this.configService.get<string>('acme.acme_path');
            const challengePath = this.configService.get<string>(
              'acme.challenge_path',
            );
            // 写入challenge 文件
            fs.writeFileSync(
              path.join(
                path.dirname(__dirname),
                acmePath,
                challengePath,
                challenge.token,
              ),
              challenge.keyAuthorization,
            );
          } catch (err) {
            // 记录错误
            this.error.set(certificate.name, err.message);
            this.logger.error('http save file err:' + err.message);
            // TODO 如果操作失败，是否需要重试
            fileSetupSuccessful = false;
          }
          // 如果校验文件报错失败，不进HTTP校验了
          if (fileSetupSuccessful) {
            const userAgent = this.configService.get<string>('acme.user_agent');
            this.logger.debug('http challenge', challenge);
            // 主动验证5次超时
            validation = await retryFuncWithDelay<boolean>(
              async () => {
                // 验证资源 `http://${identifier.value}/.well-known/acme-challenge/${challenge.token}`
                return new Promise(async (resolve, reject) => {
                  try {
                    const { data: validationToken } = await this.httpService
                      .get(
                        `http://${identifier.value}/.well-known/acme-challenge/${challenge.token}`,
                        {
                          headers: {
                            'User-Agent': userAgent,
                          },
                        },
                      )
                      .toPromise();
                    this.logger.debug(
                      'validation - keyAuthorization',
                      validationToken,
                      challenge.keyAuthorization,
                    );
                    // 比对校验
                    if (validationToken === challenge.keyAuthorization) {
                      return resolve(true);
                    }
                    return reject('token file resolve err: validation failed.');
                  } catch (err) {
                    return reject('failed resolve http: ' + err.message);
                  }
                });
              },
              5,
              3e3,
              3,
            );
          } else {
            // 文件存储错误，直接失败
            validation = false;
          }
        } else {
          // 成功还是失败
          validation = challenge.status === 'valid';
        }
      } else {
        challenge = challengesWithKeyAuthorization.find(
          (chall) => chall.type == 'dns-01',
        );
        // TODO 检查是否已经校验过了
        // pending 需要创建校验
        if (challenge.status === 'pending') {
          // TODO 如果是DNS授权模式，是使用ak/sk给用户域名增加一个TXT解析记录
          // 如果用户指定了或者手写了key_secret and dnsServerId 拿去dns关联数据
          // 用户授权dns ,是直接操作用户的DNS记录 TXT _acme-challenge.example.cn 校验keyAuthorization
          if (Number(authMode) === CERTIFICATE_AUTH_MODE.DNS_AUTH_MODE) {
            // 处理当前域名 domain and prefix
            const { domain, prefix } = extractDomainWithPrefix(
              identifier.value,
              true,
            );
            mainDomain = domain;
            RRType = 'TXT';
            // 主域名没有前缀，处理.拼接
            userRR = `_acme-challenge${prefix ? `.${prefix}` : ''}`;
          }
          // dns 设置标记
          let dnsSetupSuccessful = true;
          try {
            // 取得初始化的factory
            const factory = this.dnsFactory.get(certificate.name);
            // TODO 这里都是处理TXT记录的，代理是设置自己域名Certeasy.cn 相关用户代理 _acme-challenge.xxxxxx.certeasy.cn
            // TODO 如果是授权模式，是直接更新用户域名的TXT记录
            // TODO 都不用查了，直接写入吧，因为多域名是要多个TXT解析记录校验的
            const { recordId } = await factory.setRecord(mainDomain, {
              RR: userRR,
              type: RRType,
              value: challenge.keyAuthorization,
            });
            // 记录操作数据
            const factoryRR = this.dnsFactoryRR.get(certificate.name);
            if (factoryRR) {
              // 追加记录
              factoryRR.push({
                recordId,
                domain: mainDomain,
                RR: userRR,
                type: RRType,
              });
            }
            // 这里域名DNS是多个内容
            this.dnsFactoryRR.set(certificate.name, factoryRR);
            // asleep 停止3s 继续
            await asleep(3e3);
          } catch (err) {
            // 记录错误
            this.error.set(certificate.name, err.message);
            this.logger.error('dns set record err:' + err.message);
            // TODO 如果操作失败，是否需要重试
            dnsSetupSuccessful = false;
          }

          // 如果接口设置设置失败，不进行DNS校验了
          if (dnsSetupSuccessful) {
            this.logger.debug('dns challenge', challenge);
            // dns 验证重试
            // 验证方法要每个5s重试一次，一共30次
            validation = await retryFuncWithDelay(
              async () => {
                return await new Promise((resolve, reject) => {
                  const hostname = `${userRR}.${mainDomain}`;
                  this.logger.debug('resolveTxt dns:' + hostname);
                  dns.resolveTxt(hostname, (err: any, records: any[]) => {
                    if (err) {
                      // 记录错误
                      this.error.set(certificate.name, err.message);
                      this.logger.error('dns resolve err:' + err.message);
                      return reject('dns resolve err: validation failed.');
                    }
                    this.logger.debug(
                      'resolveTxt',
                      records.map((record: any) => record[0]),
                    );
                    const validation = records
                      .map((record: any) => record[0])
                      .some(
                        (value: string) => value === challenge.keyAuthorization,
                      );
                    if (!validation) {
                      return reject('dns resolve err: validation failed.');
                    }
                    return resolve(validation);
                  });
                });
              },
              30,
              3e3,
              3,
            );
          } else {
            // 设置DNS内容错误，设置校验失败
            validation = false;
          }
        } else {
          // 成功还是失败
          validation = challenge.status === 'valid';
        }
      }

      // asleep 停止3s 后处理
      await asleep(10e3);
    }

    // 打印file或者dns校验结果
    this.logger.debug('challenge', challenge);
    this.logger.debug('validation', validation);
    // TODO 前置校验没通过, 直接失败得了，但是按道理应该都过
    if (validation !== true) {
      return {
        validation: false,
        error: `ACME challenge active pre validation failed: ${validation}`,
      };
    }
    // 如果前置校验和acme校验都通过了则直接返回
    if (validation && challenge.status === 'valid') {
      return {
        validation: validation,
        status: challenge.status,
        error: '',
      };
    }
    // 前置校验通过，提交acme challenge
    let completeChallenge = {
      status: 'pending',
      error: '',
    };
    // asleep 停止3s 后处理
    await asleep(3e3);
    // 提交 acme 挑战 执行提交重试
    completeChallenge = await retryFuncWithDelay(
      async () => {
        return new Promise(async (resolve, reject) => {
          // 提交acme challenge completed
          try {
            const { status } = await this.acmeService.submitChallengeCompleted(
              client,
              challenge,
            );
            this.logger.debug('completeChallenge', completeChallenge);
            if (status === 'pending' || status === 'invalid') {
              return reject({
                status,
                error: `acme challenge completed err: validation ${status}.`,
              });
            }
            return resolve({ status, error: null });
          } catch (err) {
            return reject({
              status: 'invalid',
              error: 'acme challenge completed err: ' + err.message,
            });
          }
        });
      },
      3,
      2e3,
    );
    // TODO completeChallenge.status === 'invalid' 怎么处理
    // 校验通过，提交Acme 进行验证
    return {
      validation,
      ...completeChallenge,
    };
  }

  @Process('acme-order')
  async handleOrder(job: Job) {
    const { user, certificate, update, triggerType } = job.data;
    // 记录是否更新流程
    this.update.set(certificate.name, update);
    // 记录触发类型
    this.triggerType.set(certificate.name, triggerType);
    // 自动关闭任务和下发challenge任务
    let autoCloseJob: Job<any>, autoChallengeJob: Job<any>;
    try {
      // 写入一个延时 30分钟，进行关闭处理
      this.logger.log(
        'add acme-close:' + dayjs().format('YYYY-MM-DD HH:mm:ss'),
      );
      const timeout = this.configService.get<number>(
        'acme.process_timeout',
        15,
      );
      autoCloseJob = await this.certificateQueue.add(
        'acme-close',
        { certificate },
        {
          delay: timeout * 60e3,
          attempts: 3,
          removeOnComplete: true,
          removeOnFail: true,
        },
      );
      // 记录取消id, 用于后面取消队列
      this.acmeCloseJobId.set(certificate.name, autoCloseJob.id);
      // 记录日志
      acme.setLogger((message: string) =>
        this.acmeClientLogger.log(
          message,
          `process_${certificate.id}_${certificate.latestVersionId}`,
        ),
      );
      // 拉取配置
      const client = await this.getCertificateAcmeClient(user, certificate);
      const identifiers = certificate.domains.map((ident: string) => {
        return {
          type: 'dns',
          value: ident,
        };
      });
      // 无数据直接忽略
      if (identifiers.length <= 0) return job.moveToCompleted();
      const order = await this.acmeService.placeOrder(client, {
        identifiers,
      });
      // 2.dns验证 - 进到这里来，说明用户已经在前台校验过了，需要平台配置challenge
      this.logger.log(
        'add acme-challenge:' + dayjs().format('YYYY-MM-DD HH:mm:ss'),
      );
      autoChallengeJob = await this.certificateQueue.add(
        'acme-challenge',
        { user, certificate, order, identifiers },
        {
          delay: 3e3,
          attempts: 3,
          removeOnComplete: true,
          removeOnFail: true,
        },
      );
    } catch (err) {
      // 记录错误
      this.error.set(certificate.name, err.message);
      this.logger.error('acme-order err:', err.message);
      // 错误需要 移除acme-challenge and 自动关闭
      await this.removeAcmeCloseJob(certificate);
      if (autoChallengeJob) {
        await autoChallengeJob.remove();
      }
      // 抛出异常才会有下一次attempts
      throw new Error(err.message);
    }
  }

  /**
   * 更新错误数据
   * @param certificate
   */
  async updateCertificateJobInError(certificate: any) {
    try {
      this.logger.debug('certificate', certificate);
      //TODO  更新证书和记录版本为错误
      await this.certificateService.updateCertificateById(certificate.id, {
        status: 0,
      });
      await this.certificateService.updateCertificateVersion(
        certificate.id,
        {
          error: this.error.get(certificate.name),
          status: 0,
        },
        certificate.latestVersionId,
        this.triggerType.get(certificate.name),
      );
    } catch (err) {
      // 记录错误
      this.error.set(certificate.name, err.message);
      this.logger.error('acme-close', err.message);
    }
  }

  @Process('acme-close')
  async handleClose(job: Job) {
    const { certificate } = job.data;
    // 写入超时错误
    this.error.set(certificate.name, 'ACME process timeout.');
    // 自动关单独处理
    await this.updateCertificateJobInError(certificate);
    // 清理client
    this.clearAcmeClient(certificate);
    await this.removeDnsFactory(certificate);
  }

  @Process('acme-challenge')
  async handleChallenge(job: Job) {
    const { user, certificate, order, identifiers } = job.data;
    try {
      // 加载acmeClient
      const client = await this.getCertificateAcmeClient(user, certificate);
      const authorizations = await this.acmeService.getAuthorizations(
        client,
        order,
      );
      // 认证模式
      const { authMode } = certificate;
      // TODO 前置处理 dnsFactory
      let providerName = 'aliyun';
      // 这里是需要处理平台的dns
      let dnsKey = this.configService.get<string>('dns.key');
      let dnsSecret = this.configService.get<string>('dns.secret');
      if (
        [
          CERTIFICATE_AUTH_MODE.DNS_AUTH_MODE,
          CERTIFICATE_AUTH_MODE.DNS_ALIAS_AUTH_MODE,
        ].includes(Number(authMode))
      ) {
        // TODO 如果用户指定了或者手写了key_secret and dnsServerId 拿去dns关联数据
        // 用户授权dns ,是直接操作用户的DNS记录 TXT _acme-challenge.example.cn 校验keyAuthorization
        if (Number(authMode) === CERTIFICATE_AUTH_MODE.DNS_AUTH_MODE) {
          // DNS AUTH 需要加载用户的DNS serverId 内容
          const dnsInfo = await this.dnsService.getDnsInfo(
            certificate.dnsServerId,
          );
          const { configJson } = await this.dnsService.getDnsProviderInfo(
            dnsInfo.providerId,
          );
          // 解构取得值数据
          [dnsKey, dnsSecret] = Object.values(dnsInfo.accessJson);
          providerName = configJson?.name;
        }

        // DnsProviderFactory
        const factory = DnsProviderFactory.createProvider(
          providerName,
          dnsKey,
          dnsSecret,
        );
        // 设置dns factory
        this.dnsFactory.set(certificate.name, factory);
        // 初始化 RR
        this.dnsFactoryRR.set(certificate.name, []);
      }
      // acme验证类型 http-01 dns-01 tls-alpn-0
      // 验证模式 1 file 2 file-alias 3 dns 4 dns-alias
      // 系统定义类型 http-01 [1 2] dns-01 [3 4]
      // 提取对应类型的challenge, 循环处理
      const authorizationsResult = await authorizations.reduce(
        async (promiseChain, currentTask) => {
          const results = await promiseChain;
          // 处理数据 asyncExecuteChallenge
          const challengeResult = await this.asyncExecuteChallenge(
            currentTask,
            user,
            certificate,
          );
          return [...results, challengeResult];
        },
        Promise.resolve([]),
      ); // 初始值为 resolved 的 Promise 和空数组;
      this.logger.debug('authorizationsResult', authorizationsResult);
      // 主动校验通过再处理 challenge.status == 'valid'
      // 直接读取是否有错误吧
      const invalidResult = authorizationsResult.find(
        (result: any) => result.validation != true || result?.status != 'valid',
      );
      // 多次主动验证不通过的话,抛出异常
      if (invalidResult) {
        throw new Error(
          invalidResult?.error || 'authorization validation failed.',
        );
      } else {
        this.logger.log(
          'add acme-completed:' + dayjs().format('YYYY-MM-DD HH:mm:ss'),
        );
        //延迟队列 5e3 后校验处理
        const acmeCompletedJob = await this.certificateQueue.add(
          'acme-completed',
          { user, certificate, identifiers, order },
          {
            delay: 5e3,
            attempts: 3,
            removeOnComplete: true,
            removeOnFail: true,
          },
        );
        this.logger.debug('acmeCompletedJob:', acmeCompletedJob);
      }
    } catch (err) {
      // 记录错误
      this.error.set(certificate.name, err.message);
      this.logger.error('acme-challenge error:' + err.message);
      // acme challenge 校验失败，清理自动关单，错误监听里自动关单
      await this.removeAcmeCloseJob(certificate);
      // 抛出异常才会有下一次attempts
      throw new Error(err.message);
    }
  }

  @Process('acme-completed')
  async handleCompleted(job: Job) {
    const { user, certificate, identifiers, order } = job.data;
    try {
      // 加载acmeClient
      const client = await this.getCertificateAcmeClient(user, certificate);
      const acmeOrder = await this.acmeService.getOrder(client, order);
      const commonName = identifiers[0].value;
      /* Finalize order */
      const [key, csr] = await acme.crypto.createCsr({
        commonName,
        altNames: (identifiers || []).map((ident: any) => ident.value) || [],
      });
      this.logger.debug('acme-completed.key', key.toString());
      this.logger.debug('acme-completed.csr', csr.toString());
      // 验证
      const cert = await this.acmeService.finalizeOrderGetCertificate(
        client,
        acmeOrder,
        csr,
      );
      this.logger.debug('acme-completed.cert', cert.toString());
      // 清理client
      this.clearAcmeClient(certificate);
      await this.removeAcmeCloseJob(certificate);
      await this.removeDnsFactory(certificate);
      // TODO 证书存储，先写入本地
      this.logger.log(
        'add acme-download:' + dayjs().format('YYYY-MM-DD HH:mm:ss'),
      );
      const files = [
        { name: 'csr.pem', content: csr.toString() },
        { name: 'key.pem', content: key.toString() },
        { name: 'cert.pem', content: cert.toString() },
      ];
      const acmePath = this.configService.get<string>('acme.acme_path');
      const certificatePath = this.configService.get<string>(
        'acme.certificate_path',
      );
      // 创建本地存储路径
      const commonCertPath = path.join(
        path.dirname(__dirname),
        acmePath,
        certificatePath,
        certificate.name || `unkown-${Date.now()}`,
        `version-${certificate.latestVersionId}`,
      );
      // recursive 多级处理
      if (!fs.existsSync(commonCertPath)) {
        fs.mkdirSync(commonCertPath, { recursive: true });
      }
      files.forEach((file) => {
        this.logger.debug(
          'acme-download.file',
          path.join(commonCertPath, '/', file.name),
        );
        fs.writeFileSync(
          path.join(commonCertPath, '/', file.name),
          file.content,
        );
      });
      //TODO  更新证书和记录版本
      // 读取证书信息
      const certInfo = readCertificateInfo(cert.toString());
      // 更新证书状态和激活id
      await this.certificateService.updateCertificateById(certificate.id, {
        latestValidVersionId: certificate.latestVersionId,
        status: 2,
      });
      // 更新证书版本信息
      await this.certificateService.updateCertificateVersion(
        certificate.id,
        {
          error: '',
          expiredTime: dayjs(certInfo.valid_to).format(DATE_FORMAT),
          status: 2,
        },
        certificate.latestVersionId,
        this.triggerType.get(certificate.name),
      );
      // 更新证书详情
      await this.certificateService.createCertificateDetail(
        certificate.latestVersionId,
        {
          ...certInfo,
          validFrom: certInfo.valid_from,
          validTo: certInfo.valid_to,
          key: key.toString(),
          certificate: cert.toString(),
        },
      );
      // 是否更新流程  下发证书更新通知
      if (this.update.get(certificate.name)) {
        await this.notificationService.triggerNotification(user, 2, {
          certificates: [
            {
              name: certificate.name,
              alias: '',
              domains:
                (identifiers || []).map((ident: any) => ident.value) || [],
              status: 2,
              expiredTime: dayjs(certInfo.valid_to).format(DATE_FORMAT),
            },
          ],
        });
        // TODO 证书是否需要部署，如果自动部署则需要更新云资源
        if (certificate && certificate.autoPush) {
          this.logger.debug('TODO 证书需要自动更新到云资源');
          await this.certificateService.autoDeploy(user, certificate?.id);
        }
      }
    } catch (err) {
      // 记录错误
      this.error.set(certificate.name, err.message);
      this.logger.error('acme-completed err:' + err.message);
      // 抛出异常才会有下一次attempts
      throw new Error(err.message);
    }
  }
}
