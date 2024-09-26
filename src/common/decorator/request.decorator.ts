import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import * as requestIp from 'request-ip';

export const IsGet = createParamDecorator(
  (data: string, ctx: ExecutionContext) => {
    const { method } = ctx.switchToHttp().getRequest();
    return String(method).toLocaleUpperCase() === 'GET';
  },
);

export const IsPost = createParamDecorator(
  (data: string, ctx: ExecutionContext) => {
    const { method } = ctx.switchToHttp().getRequest();
    return String(method).toLocaleUpperCase() === 'POST';
  },
);

export const IRequestUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);

export const IP = createParamDecorator(
  (data: string, ctx: ExecutionContext) => {
    const req = ctx.switchToHttp().getRequest();
    if (req.clientIp) return req.clientIp;
    return requestIp.getClientIp(req);
  },
);
