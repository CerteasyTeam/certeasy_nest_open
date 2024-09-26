import { InjectQueue, OnQueueFailed, Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job, Queue } from 'bull';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
// @app
import { AppException } from '@app/common';
import {
  CloudFactory,
  asleep,
  retryFuncWithDelay,
  calculateMaxRetries,
} from '@app/utils';
// service
import { CloudService } from '../cloud.service';

@Processor('cloud')
export class CloudProcessor {
  private readonly logger = new Logger(CloudProcessor.name);

  // 错误信息，用于写入记录
  private error: Map<string, any> = new Map<string, ''>();

  constructor(
    @InjectQueue('cloud')
    private cloudQueue: Queue,
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    private readonly cloudService: CloudService,
  ) {}

  @OnQueueFailed()
  async handleQueueFailed(job: Job) {
    this.logger.debug('===========   handleQueueFailed  start  ===========');
    const attemptsMade = job.attemptsMade;
    const maxAttempts = job.opts.attempts;
    if (attemptsMade === maxAttempts) {
      const { user, deploy, triggerType } = job.data;
      const error = this.error.get(deploy.id);
      console.log('This was the last attempt, and it failed.');
      await this.updateDeployInfo(user, deploy, 0, error, triggerType);
      // 删除job
      await job.remove();
    }
    this.logger.debug('===========   handleQueueFailed  end  ===========');
  }

  /**
   * @param job
   */
  @Process('deploy')
  async process(job: Job) {
    this.logger.log(`Processing job ${job.id}`);
    const { user, waiting, deploy, triggerType } = job.data;
    try {
      // Process the job here
      // * 部署需要材料
      // 1. 证书内容信息  key certificate - 来源 certificateDetail
      // 2. 云资源配置信息 cloud
      // 提取配置
      const {
        accessJson,
        name,
        providerName,
        providerProductName,
        certKey,
        certCsr,
      } = waiting;
      // 请求接口
      const cloudFactory = CloudFactory.createProvider(
        providerName,
        JSON.parse(accessJson),
      );
      try {
        // 设置ssl 证书
        const targetId = await cloudFactory.deploy(providerProductName, {
          name,
          key: certKey,
          cert: certCsr,
        });
        // TODO  3s 后执行查job
        const verifyJob = await this.cloudQueue.add(
          'verify',
          {
            user,
            accessJson,
            providerName,
            providerProductName,
            targetId,
            deploy,
            triggerType,
          },
          {
            delay: 3e3,
            attempts: 3,
            removeOnComplete: true,
            removeOnFail: true,
          },
        );
        this.logger.debug('add verify job', verifyJob);
      } catch (e) {
        this.logger.error('cloud factory deploy err: ' + e.message);
        this.error.set(deploy.id, e.message);
        throw new AppException(e.message);
      }
    } catch (err) {
      this.logger.error('deploy err: ' + err.message);
      this.error.set(deploy.id, err.message);
      throw new AppException('deploy err: ' + err.message);
    }
  }

  /**
   * @param job
   */
  @Process('verify')
  async handler(job: Job) {
    const {
      user,
      accessJson,
      providerName,
      providerProductName,
      targetId,
      deploy,
      triggerType,
    } = job.data;
    const cloudFactory = CloudFactory.createProvider(
      providerName,
      JSON.parse(accessJson),
    );
    try {
      // TODO 这里最好再单开一个 process 检查证书
      // 循环查询最大10次 累加3s查询
      const maxTime = 600e3;
      const defaultRetryDelay = 3e3;
      // 计算最大次数
      const maxRetries = calculateMaxRetries(defaultRetryDelay, maxTime);
      // 循环检查
      const verifyResult = await retryFuncWithDelay(
        async () => {
          return new Promise(async (resolve, reject) => {
            try {
              const verify = await cloudFactory.verify(
                providerProductName,
                targetId as unknown as any,
              );
              if (verify) {
                return resolve(verify);
              }
              return reject(false);
            } catch (err) {
              return reject(err);
            }
          });
        },
        maxRetries,
        defaultRetryDelay,
      );
      if (verifyResult) {
        // 设置成功状态
        await this.updateDeployInfo(user, deploy, 2, '', triggerType);
      } else {
        await this.updateDeployInfo(
          user,
          deploy,
          0,
          '验证部署超时，请您手动打开云服务控制台查看是否部署正常',
          triggerType,
        );
      }
    } catch (err) {
      this.error.set(deploy.id, err.message);
      this.logger.error('cloud factory verify err: ' + err.message);
      throw new AppException('verify err: ' + err.message);
    }
  }

  /**
   * update
   * @param user
   * @param deploy
   * @param status
   * @param error
   * @param triggerType
   * @private
   */
  private async updateDeployInfo(
    user: any,
    deploy: any,
    status: number,
    error = '',
    triggerType = 'manual',
  ) {
    await this.cloudService.updateDeployByID(
      user,
      deploy?.id,
      {
        error,
        status,
      },
      triggerType,
    );
  }
}
