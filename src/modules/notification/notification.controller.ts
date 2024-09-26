import {
  HttpStatus,
  Logger,
  Controller,
  Get,
  Put,
  Query,
  Body,
  Param,
  ParseIntPipe,
  Post,
  Delete,
  BadRequestException,
} from '@nestjs/common';
import * as _ from 'lodash';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
// @app/common
import {
  IRequestUser,
  BaseApiErrorResponse,
  SwaggerBaseApiResponse,
  BaseQueryInput,
} from '@app/common';
// service
import { NotificationService } from './notification.service';
import {
  CreateChannelIDto,
  UpdateChannelIDto,
  QueryNotificationChannelDto,
  UpdateConfigIDto,
  UpdateChannelFieldDto,
} from './dtos';
// dtos

@ApiTags('notification')
@ApiBearerAuth()
@Controller('notification')
export class NotificationController {
  // logger
  readonly logger = new Logger(NotificationController.name);
  constructor(private readonly notificationService: NotificationService) {}

  @Get('config')
  @ApiOperation({
    summary: '通知配置',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    type: BaseApiErrorResponse,
  })
  async config(@IRequestUser() user: IUserPayload) {
    return this.notificationService.config(user);
  }

  @Post('check')
  @ApiOperation({
    summary: '通知检查',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    type: BaseApiErrorResponse,
  })
  async check(
    @IRequestUser() user: IUserPayload,
    @Body() data: CreateChannelIDto,
  ) {
    return this.notificationService.checkChannel(user, data);
  }

  @Put('config/:id')
  @ApiOperation({
    summary: '配置通知',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    type: BaseApiErrorResponse,
  })
  @ApiParam({ name: 'id', description: 'Channel id' })
  async updateConfig(
    @IRequestUser() user: IUserPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() data: UpdateConfigIDto,
  ) {
    return this.notificationService.updateConfig(user, id, data);
  }

  @Get('channel')
  @ApiOperation({
    summary: '通知渠道',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    type: BaseApiErrorResponse,
  })
  async channel(
    @IRequestUser() user: IUserPayload,
    @Query() query: QueryNotificationChannelDto,
  ) {
    return this.notificationService.listChannel(user, query);
  }

  @Post('channel')
  @ApiOperation({
    summary: '通知渠道',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    type: BaseApiErrorResponse,
  })
  async createChannel(
    @IRequestUser() user: IUserPayload,
    @Body() data: CreateChannelIDto,
  ) {
    return this.notificationService.createChannel(user, data);
  }

  @Get('channel/:id')
  @ApiOperation({
    summary: '通知渠道',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    type: BaseApiErrorResponse,
  })
  @ApiParam({ name: 'id', description: 'Channel id' })
  async channelInfo(
    @IRequestUser() user: IUserPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.notificationService.channelInfo(user, id);
  }

  @Put('channel/:id')
  @ApiOperation({
    summary: '更新渠道',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    type: BaseApiErrorResponse,
  })
  @ApiParam({ name: 'id', description: 'Channel id' })
  async updateChannelInfo(
    @IRequestUser() user: IUserPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() data: UpdateChannelIDto,
  ) {
    return this.notificationService.updateChannelInfo(user, id, data);
  }

  @Put('channel/:id/:field')
  @ApiOperation({
    summary: '更新渠道详情',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    type: BaseApiErrorResponse,
  })
  @ApiParam({ name: 'id', description: 'Channel id' })
  @ApiParam({ name: 'field', description: 'Channel field' })
  async updateField(
    @IRequestUser() user: IUserPayload,
    @Param('id', ParseIntPipe) id: number,
    @Param('field') field: string,
    @Body() data: UpdateChannelFieldDto,
  ) {
    // 处理下是否存在字段数据
    if (!_.has(data, field)) {
      throw new BadRequestException('数据异常，无法匹配传递参数');
    }
    return this.notificationService.updateChannelInfo(user, id, data);
  }

  @Delete('channel/:id')
  @ApiOperation({
    summary: '删除渠道',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    type: BaseApiErrorResponse,
  })
  @ApiParam({ name: 'id', description: 'Channel id' })
  async deleteChannel(
    @IRequestUser() user: IUserPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.notificationService.deleteChannelInfo(user, id);
  }

  @Get('provider')
  @ApiOperation({
    summary: '通知供应商',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    type: BaseApiErrorResponse,
  })
  async provider(@Query() query: BaseQueryInput) {
    return this.notificationService.listProvider(query);
  }
}
