import {
  HttpStatus,
  Controller,
  Logger,
  Get,
  Post,
  Body,
  HttpCode,
  Param,
  ParseIntPipe,
  Res,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
// @app
import {
  Public,
  BaseApiErrorResponse,
  SwaggerBaseApiResponse,
  IRequestUser,
  IgnoreTransform,
} from '@app/common';
// service
import { CoinService } from './coin.service';
// dtos
import { CreateOrderDto } from './dtos';
import { Response } from 'express';

@ApiTags('coin')
@Controller('coin')
export class CoinController {
  // logger
  readonly logger = new Logger(CoinController.name);

  constructor(private readonly coinService: CoinService) {}

  @Get('pods')
  @ApiOperation({
    summary: '获取充值配置',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    type: BaseApiErrorResponse,
  })
  async pods() {
    return await this.coinService.pods();
  }

  @Get('order/:id')
  @ApiOperation({
    summary: '订单信息',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    type: BaseApiErrorResponse,
  })
  @ApiParam({ name: 'id', type: Number, description: '订单ID' })
  async order(
    @IRequestUser() user: IUserPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return await this.coinService.orderInfo(user, id);
  }

  @Post('order')
  @ApiOperation({
    summary: '充值下单',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    type: BaseApiErrorResponse,
  })
  @HttpCode(HttpStatus.OK)
  async placeOrder(
    @IRequestUser() user: IUserPayload,
    @Body() data: CreateOrderDto,
  ) {
    return await this.coinService.placeOrder(user, data);
  }

  @Post('notify/:provider')
  @Public()
  @IgnoreTransform()
  @ApiOperation({
    summary: '异步回调',
  })
  @HttpCode(HttpStatus.OK)
  @ApiParam({ name: 'provider', type: String, description: '支付服务商' })
  async notify(
    @Param('provider') provider: string,
    @Body() data: string,
    @Res() res: Response,
  ) {
    const result = await this.coinService.payCallback(provider, data);
    // 这里需要直接输出
    res.status(HttpStatus.OK).send(result);
    return;
  }
}
