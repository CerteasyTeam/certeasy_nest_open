import {
  Controller,
  Get,
  Body,
  All,
  HttpStatus,
  Res,
  Query,
  HttpCode,
  Req,
} from '@nestjs/common';
import { AppService } from './app.service';
import { IP, Public } from '@app/common';
import { Request, Response } from 'express';
import { cryptoMd5 } from '@app/utils';
// dtos
import { IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

class OpenApiDto {
  @IsOptional()
  @ApiPropertyOptional({
    description: '服务商id',
    example: '1',
  })
  public providerId?: number;
}

@Controller()
@Public()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(@IP() ip: string, @Req() req: Request) {
    return {
      time: Date.now(),
      ip,
      headers: req.headers,
    };
  }

  @Get('/openapi/certificate')
  getCertificate(@Body() data: OpenApiDto) {
    return data;
  }

  @All('/webhook')
  @HttpCode(HttpStatus.OK)
  webhook(@Body() data: any, @Query() query: any, @Res() res: Response) {
    const requestBody = {
      ...data,
      ...query,
    };
    if (!requestBody?.timestamp) {
      res.status(HttpStatus.OK).send('failed');
      return;
    }
    // 签名校验
    const sign = cryptoMd5(
      requestBody?.timestamp + cryptoMd5('kYGx00CwCVYy3rtr38GgEoP5GB6ITX0w'),
    );
    if (sign !== requestBody?.sign) {
      res.status(HttpStatus.OK).send('sign failed');
      return;
    }
    // 这里需要直接输出
    res.status(HttpStatus.OK).send('success');
    return;
  }
}
