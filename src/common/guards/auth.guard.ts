import {
  Logger,
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthGuard as IAuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';
import { Request } from 'express';
// @app/common
import { IS_PUBLIC_KEY } from '@app/common';

@Injectable()
export class AuthGuard extends IAuthGuard('jwt') {
  // logger
  readonly logger = new Logger(AuthGuard.name);
  constructor(
    private reflector: Reflector,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {
    super();
  }

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const ignoreAuth = this.reflector.getAllAndOverride<boolean>(
      IS_PUBLIC_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (ignoreAuth) return true;

    // 使用PassportStrategy进行处理
    return super.canActivate(context);
  }
  // canActivate(
  //   context: ExecutionContext,
  // ): boolean | Promise<boolean> | Observable<boolean> {
  //   const ignoreAuth = this.reflector.getAllAndOverride<boolean>(
  //     IS_PUBLIC_KEY,
  //     [context.getHandler(), context.getClass()],
  //   );

  //   if (ignoreAuth) {
  //     return true;
  //   }

  //   // 从请求头获取token
  //   const request = context.switchToHttp().getRequest<Request>();
  //   const headerAuthorization = request.headers.authorization || '';
  //   const token = headerAuthorization.split(' ')[1];
  //   if (!token) throw new UnauthorizedException();
  //   this.logger.debug('token:' + token);
  //   try {
  //     const payload = this.jwtService.verify(token, {
  //       secret: this.configService.get<string>('jwt.secret_key'),
  //     });
  //     this.logger.debug(payload);
  //     // 校验通过，注入用户信息到请求体里
  //     if (payload) {
  //       request['user'] = payload;
  //     }
  //   } catch (e) {
  //     this.logger.error('verify err:' + e.message);
  //     throw new UnauthorizedException('UnauthorizedException');
  //   }
  //   return true;
  // }
}
