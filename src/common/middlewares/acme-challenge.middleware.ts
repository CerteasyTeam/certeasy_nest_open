import { Inject, Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response, NextFunction } from 'express';
import * as path from 'path';
import * as fs from 'fs';
import { Cache } from 'cache-manager';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { USER_CACHE_PREFIX } from '@app/common';

@Injectable()
export class AcmeChallengeMiddleware implements NestMiddleware {
  private readonly logger = new Logger(AcmeChallengeMiddleware.name);
  constructor(
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
    private readonly configService: ConfigService,
  ) {}
  async use(req: Request, res: Response, next: NextFunction) {
    if (req.originalUrl.startsWith('/.well-known/acme-challenge')) {
      this.logger.log(`============   acme-challenge  start  ============`);
      const acmePath = this.configService.get<string>('acme.acme_path');
      const challengePath = this.configService.get<string>(
        'acme.challenge_path',
      );
      // 截取acmeToken
      const acmeToken = req.originalUrl.split('/').pop() || '';
      this.logger.debug(`acmeToken => ${acmeToken}`);
      if (req.originalUrl.includes('certeasy-')) {
        // 取得userCode
        const headerUserCode = <string>req.headers['x-user-code'];
        // TODO 校验userToken
        this.logger.log(`${USER_CACHE_PREFIX}code:${headerUserCode}`);
        const userCode = await this.cacheManager.get(
          USER_CACHE_PREFIX + `code:${headerUserCode}`,
        );
        this.logger.debug('userCode', userCode);
        return res.status(200).send({
          detail: {
            proxyCheck: true,
            headerTokenCheck: !!userCode,
            acmeToken,
            headerUserCode,
            requestHeaders: req.headers,
          },
          success: !!userCode,
          error: userCode
            ? 'OK'
            : '请求头[x-user-code]配置错误，请检查配置后重试',
        });
      }
      const challengeFilePath = path.join(
        path.dirname(__dirname),
        acmePath,
        challengePath,
        acmeToken,
      );

      this.logger.debug('challenge path => ' + challengeFilePath);

      try {
        const token = fs.readFileSync(challengeFilePath, 'utf-8');
        this.logger.debug(`challenge token => ${token}`);
        this.logger.log(`============   acme-challenge  end  ============`);
        res.status(200).send(token);
      } catch (error) {
        res.status(200).send('OK');
      }
      return;
    }
    next();
  }
}
