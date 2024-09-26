import {
  BadRequestException,
  Injectable,
  Logger,
  Inject,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cache } from 'cache-manager';
import { CACHE_MANAGER } from '@nestjs/cache-manager';

// logger
import { AcmeClientLogger } from './loggers';

// acme
import * as acme from 'acme-client';
import * as rfc8555 from 'acme-client/types/rfc8555';
import {
  CertificateBuffer,
  CertificateString,
  ClientExternalAccountBindingOptions,
} from 'acme-client';

// contants

import { HttpService } from '@nestjs/axios';
import * as path from 'path';
// GoogleAuth
import { GoogleAuth } from 'google-auth-library';
import { google } from 'googleapis';
import { v1beta1, v1 } from '@google-cloud/publicca';

@Injectable()
export class AcmeService {
  private readonly logger = new Logger(AcmeService.name);
  constructor(
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}
  /**
   * 用户acme客户端
   */
  private userAcmeClient: Map<string, acme.Client> = new Map<
    string,
    acme.Client
  >();

  /**
   * 创建私钥Key
   * @param keySize number
   * @returns string
   */
  async createPrivateKey(keySize = 2048) {
    return (await acme.crypto.createPrivateKey(keySize)).toString();
  }

  /**
   * 获取access Token
   */
  async getAccessToken(provider: string) {
    if (provider === 'google') {
      // TODO google cloud auth 必须外网服务器才能访问到
      const auth = new GoogleAuth({
        keyFile: path.join(process.cwd(), './google/account-key.json'),
        scopes: ['https://www.googleapis.com/auth/cloud-platform'],
      });

      console.log('auth', auth);

      const client = await auth.getClient();
      const accessToken = await client.getAccessToken();

      this.logger.log('Google Access Token:', accessToken.token);
      return accessToken.token;
    } else {
      // 读取配置
      return this.configService.get('zerossl.access_key', '');
    }
  }

  /**
   * 获取accessToken
   */
  async getToken(provider: string) {
    const tokenKey = `acme:token:${provider}`;
    // 读取 token
    let accessToken = await this.cacheManager.get(tokenKey);
    if (!accessToken) {
      accessToken = await this.getAccessToken(provider);
      if (accessToken) {
        // 缓存记录
        await this.cacheManager.set(tokenKey, accessToken, 3600 * 1e3);
      }
    }
    return accessToken;
  }

  /**
   * createExternalAccountKey
   * @param provider
   * @param projectId
   * @param location
   */
  async createExternalAccountKey(
    provider: string,
    projectId = 'certeasy',
    location = 'global',
  ): Promise<ClientExternalAccountBindingOptions> {
    try {
      // 如果是zerossl 直接就是请求接口返回了
      if (provider === 'zerossl') {
        const accessToken = await this.getToken(provider);
        const response = await this.httpService
          .post(
            `https://api.zerossl.com/acme/eab-credentials?access_key=${accessToken}`,
          )
          .toPromise();
        if (response && response?.data && response?.data?.success) {
          return {
            kid: response.data.eab_kid,
            hmacKey: response.data.eab_hmac_key,
          };
        }
      } else {
        // 设置访问令牌和 API 请求 URL
        const accessToken = await this.getToken(provider);

        // 构建externalAccountKeys v1 正式 / v1beta1 测试
        const version =
          this.configService.get('app.env', 'production') === 'production'
            ? 'v1'
            : 'v1beta1';
        const url = `https://publicca.googleapis.com/${version}/projects/${projectId}/locations/${location}/externalAccountKeys`;
        const response = await this.httpService
          .post(
            url,
            {},
            {
              headers: {
                Authorization: `Bearer ${accessToken}`,
              },
            },
          )
          .toPromise();
        if (response && response.data) {
          /**
           * {
           *   name: 'projects/certeasy/locations/global/externalAccountKeys/ebdb6c9cfd89df9cef52239ef1afce5c',
           *   keyId: 'ebdb6c9cfd89df9cef52239ef1afce5c',
           *   b64MacKey: 'cG42bkp6UlRMZTQxSm1oTWJ3aE9JOEJ5REtQS2JqUTdnTmx5MGNZOVUtaVhuaVZ1b1Vyb0tCTW91VjdpS0FoOUdzWGg5aDhXSDMtWms3Q2RwSlZLU2c='
           * }
           */
          return {
            kid: response.data.keyId,
            hmacKey: Buffer.from(response.data.b64MacKey, 'base64').toString(
              'utf-8',
            ), // 需要解码base64
          };
        }
      }
      throw new BadRequestException('create external account key failed');
    } catch (err) {
      this.logger.error(`create external account key err: ${err.message}`);
      throw new BadRequestException(err);
    }
  }

  /**
   * 构建acme Client
   * @param user
   * @param clientOptions
   * @param provider
   */
  async createAcmeClient(
    user: IUserPayload | null,
    clientOptions?: acme.ClientOptions,
    provider?: string,
  ): Promise<{ client: acme.Client; account: acme.ClientOptions }> {
    const env = this.configService.get('app.env', 'production');
    // directoryUrl
    const directoryUrl =
      env === 'development'
        ? acme.directory[provider || 'letsencrypt'].staging
        : acme.directory[provider || 'letsencrypt'].production;
    this.logger.debug('directoryUrl', directoryUrl);
    // 预配置返回client
    if (clientOptions && clientOptions.accountUrl) {
      this.logger.log('clientOptions', clientOptions);
      const client = new acme.Client({
        directoryUrl,
        ...clientOptions,
      });
      return {
        client,
        account: {
          directoryUrl,
          ...clientOptions,
        },
      };
    }
    // 创建用户acme账户并返回
    const accountKey = await this.createPrivateKey();
    const newClientOptions: acme.ClientOptions = {
      directoryUrl,
      accountKey,
      externalAccountBinding: null,
    };
    // TODO 如果是google zerossl 需要eab数据
    if (provider && ['google', 'zerossl'].includes(provider)) {
      newClientOptions.externalAccountBinding =
        await this.createExternalAccountKey(provider);
    }
    // provider zerossl 只有production
    if (provider === 'zerossl') {
      newClientOptions.directoryUrl = acme.directory.zerossl.production;
    }
    this.logger.log('new clientOptions => ' + JSON.stringify(newClientOptions));
    const client = new acme.Client(newClientOptions);
    const userAgent = this.configService.get<string>('acme.user_agent');
    this.logger.debug('userAgent', userAgent);
    acme.axios.defaults.headers.common['User-Agent'] = userAgent;
    await client.createAccount({
      termsOfServiceAgreed: true,
      contact: [`mailto:${user.email || 'me@mail.certeasy.cn'}`],
    });
    const accountUrl = client.getAccountUrl();
    this.logger.debug('account', accountUrl);
    return {
      client,
      account: {
        ...newClientOptions,
        accountUrl,
      },
    };
  }

  /**
   * 下订单
   * @param client
   * @param orderRequest
   */
  async placeOrder(
    client: acme.Client,
    orderRequest: rfc8555.OrderCreateRequest,
  ) {
    this.logger.debug('IOrderCreateRequest', { orderRequest });
    try {
      /* Place new order */
      return await client.createOrder({
        identifiers: [{ type: 'dns', value: 'certeasy.cn' }],
        ...orderRequest,
      });
    } catch (err) {
      throw new BadRequestException(err);
    }
  }

  /**
   * 取得订单信息
   * @param client any
   * @param order any
   * @returns
   */
  async getOrder(client: acme.Client, order: any) {
    try {
      return await client.getOrder(order);
    } catch (err) {
      throw new BadRequestException(err);
    }
  }

  /**
   * 取得认证信息
   * @param client any
   * @param order any
   * @returns
   */
  async getAuthorizations(client: acme.Client, order: any) {
    try {
      return await client.getAuthorizations(order);
    } catch (err) {
      throw new BadRequestException(err);
    }
  }

  /**
   * 获取订单的keyAuthorizzation信息
   * @param client
   * @param challenge
   * @returns
   */
  async getChallengeKeyAuthorization(client: acme.Client, challenge: any) {
    try {
      return await client.getChallengeKeyAuthorization(challenge);
    } catch (err) {
      throw new BadRequestException(err);
    }
  }

  /**
   * 提交完成单
   * @param client
   * @param challenge
   * @returns
   */
  async submitChallengeCompleted(client: acme.Client, challenge: any) {
    try {
      // 提交完成单 - 通知 acme 服务器进行验证
      const completeChallenge = await client.completeChallenge(challenge);
      this.logger.debug('acme-challenge.completeChallenge', completeChallenge);
      return completeChallenge;
    } catch (err) {
      this.logger.error('acme-challenge.completeChallenge.err:' + err.message);
      throw new BadRequestException(err.message);
    }
  }

  /**
   * 结束订单下发证书
   * @param client
   * @param order
   * @param csr
   * @param isFinalize
   * @returns
   */
  async finalizeOrderGetCertificate(
    client: acme.Client,
    order: any,
    csr: Buffer | string,
    isFinalize = false,
  ) {
    try {
      // 验证
      if (isFinalize) {
        return await client.getCertificate(order);
      }
      const finalized = await client.finalizeOrder(order, csr);
      return await client.getCertificate(finalized);
    } catch (err) {
      if (
        err.message ===
        `Order's status ("valid") is not acceptable for finalization`
      ) {
        // 订单已经完成，直接生成证书
        return await this.finalizeOrderGetCertificate(client, order, csr, true);
      }
      throw new BadRequestException(err);
    }
  }

  /**
   * 吊销证书
   * @param client
   * @param cert
   * @param data
   */
  async revokeCertificate(
    client: acme.Client,
    cert: CertificateBuffer | CertificateString,
    data?: rfc8555.CertificateRevocationRequest,
  ) {
    try {
      // 提交完成单 - 通知 acme 服务器进行验证
      const revokeResponse = await client.revokeCertificate(cert, data);
      this.logger.debug('acme.revokeCertificate', revokeResponse);
      return revokeResponse;
    } catch (err) {
      this.logger.error('acme.revokeCertificate.err:' + err.message);
      throw new BadRequestException(err.message);
    }
  }
}
