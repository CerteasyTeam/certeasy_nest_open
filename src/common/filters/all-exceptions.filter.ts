import {
  Logger,
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { plainToClass } from 'class-transformer';
import * as requestIp from 'request-ip';
// @app
import { BaseApiErrorResponse } from '../dtos';
import * as dayjs from 'dayjs';
import { ValidationException } from '../exceptions';

@Catch()
export class AllExceptionsFilter<T> implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);
  /** set config context */
  constructor(private config: ConfigService) {}

  catch(exception: T, host: ArgumentsHost): any {
    const ctx = host.switchToHttp();
    const req: Request = ctx.getRequest<Request>();
    const res: Response = ctx.getResponse<Response>();

    // 请求地址
    const { baseUrl, url, method } = req;
    const ip = requestIp.getClientIp(req);
    const path = baseUrl + url;
    const timestamp = dayjs().format('YYYY-MM-DD HH:mm:ss');

    let stack: any = '';
    let statusCode: HttpStatus = HttpStatus.SERVICE_UNAVAILABLE;
    let errorName = 'InternalException';
    let message: string = (exception as Error).message;
    let details: string | Record<string, any> = [];

    if (exception instanceof ValidationException) {
      statusCode = exception.getStatus();
      errorName = exception.constructor.name;
      // ValidationErrorType
      details = exception.getResponse();
      message = (details as ValidationErrorType).error || '参数不正确';
    } else if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      errorName = exception.constructor.name;
      details = exception.getResponse();
    } else if (exception instanceof Error) {
      errorName = exception.constructor.name;
      stack = exception.stack;
      details = stack;
    }

    const error = {
      code: statusCode,
      message,
      path,
      details,
      timestamp,
    };
    // path
    this.logger.error(`[${ip}] ${method} ${path}`);
    // log
    this.logger.error({
      statusCode,
      message: error.message,
      errorName,
      stack,
    });

    // Suppress original internal server error details in prod mode
    const isProMood = this.config.get<string>('env') !== 'development';
    if (isProMood && statusCode === HttpStatus.INTERNAL_SERVER_ERROR) {
      error.message = 'Internal server error';
    }

    // error stack
    if (!isProMood) {
      error['stack'] = stack;
    }

    // res.status(statusCode).json(error);
    res.status(statusCode).json(plainToClass(BaseApiErrorResponse, error));
  }
}
