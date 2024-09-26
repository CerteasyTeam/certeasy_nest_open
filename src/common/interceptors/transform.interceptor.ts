import {
  Logger,
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { Reflector } from '@nestjs/core';
import { map } from 'rxjs/operators';
import { IS_IGNORE_TRANSFORM } from '@app/common';
import { BaseApiResponse } from '../dtos';

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, BaseApiResponse<T>>
{
  private readonly logger = new Logger(TransformInterceptor.name);

  constructor(private readonly reflector: Reflector) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<BaseApiResponse<T>> {
    const IS_IGNORE = this.reflector.getAllAndOverride<boolean>(
      IS_IGNORE_TRANSFORM,
      [context.getHandler(), context.getClass()],
    );

    if (IS_IGNORE) return next.handle().pipe();

    return next.handle().pipe(
      map((data) => {
        return {
          code: 0,
          data,
          message: 'ok',
        };
      }),
    );
  }
}
