import {
  Logger,
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import * as requestIp from 'request-ip';
import { Request, Response } from 'express';
import { IS_IGNORE_LOGGING } from '@app/common';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('LoggingInterceptor');
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const IS_IGNORE = this.reflector.getAllAndOverride<boolean>(
      IS_IGNORE_LOGGING,
      [context.getHandler(), context.getClass()],
    );

    if (IS_IGNORE) return next.handle().pipe();

    const request: Request = context.switchToHttp().getRequest<Request>();
    const method = request.method;
    const ip = requestIp.getClientIp(request);
    this.logger.log(`request <- [${ip}] ${method} ${request.url}`);
    this.logger.debug('<- query: ' + JSON.stringify(request.query));
    this.logger.debug('<- params: ' + JSON.stringify(request.params));
    this.logger.debug('<- body: ' + JSON.stringify(request.body));

    const now = Date.now();
    return next.handle().pipe(
      tap((data) => {
        const response: Response = context.switchToHttp().getResponse();
        const statusCode = response.statusCode;

        const responseTime = Date.now() - now;

        this.logger.log(
          `response -> [${ip}] ${statusCode} ${method} ${request.url} ${responseTime}ms`,
        );
        this.logger.debug('-> body: ' + JSON.stringify(data));
      }),
    );
  }
}
