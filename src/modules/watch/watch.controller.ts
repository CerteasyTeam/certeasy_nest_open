import {
  HttpStatus,
  Controller,
  Logger,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Query,
  Param,
  ParseIntPipe,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
// @app
import { BaseApiErrorResponse, IRequestUser } from '@app/common';
// service
import { WatchService } from './watch.service';
// dtos
import { QueryWatchDto, CreateWatchIDto, UpdateWatchIDto } from './dtos';
import * as _ from 'lodash';

@ApiTags('watch')
@Controller('watch')
export class WatchController {
  // logger
  readonly logger = new Logger(WatchController.name);

  constructor(private readonly watchService: WatchService) {}

  @Get('')
  @ApiOperation({
    summary: '监控列表',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    type: BaseApiErrorResponse,
  })
  async list(
    @IRequestUser() user: IUserPayload,
    @Query() query: QueryWatchDto,
  ) {
    return await this.watchService.list(user, query);
  }

  @Post('')
  @ApiOperation({
    summary: '增加监控',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    type: BaseApiErrorResponse,
  })
  async create(
    @IRequestUser() user: IUserPayload,
    @Body() data: CreateWatchIDto,
  ) {
    return await this.watchService.create(user, data);
  }

  @Get(':id')
  @ApiOperation({
    summary: '监控详情',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    type: BaseApiErrorResponse,
  })
  @ApiParam({ name: 'id', description: '监控ID' })
  async info(
    @IRequestUser() user: IUserPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return await this.watchService.info(user, id);
  }

  @Put(':id')
  @ApiOperation({
    summary: '更新监控',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    type: BaseApiErrorResponse,
  })
  @ApiParam({ name: 'id', description: '监控ID' })
  async update(
    @IRequestUser() user: IUserPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() data: UpdateWatchIDto,
  ) {
    return await this.watchService.update(user, id, data);
  }

  @Put(':id/:field')
  @ApiOperation({
    summary: '更新监控详情',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    type: BaseApiErrorResponse,
  })
  @ApiParam({ name: 'id', description: 'Watch id' })
  @ApiParam({ name: 'field', description: 'Watch field' })
  async updateField(
    @IRequestUser() user: IUserPayload,
    @Param('id', ParseIntPipe) id: number,
    @Param('field') field: string,
    @Body() data: UpdateWatchIDto,
  ) {
    // 处理下是否存在字段数据
    if (!_.has(data, field)) {
      throw new BadRequestException('数据异常，无法匹配传递参数');
    }
    return await this.watchService.update(user, id, data);
  }

  @Delete(':id')
  @ApiOperation({
    summary: '删除监控',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    type: BaseApiErrorResponse,
  })
  @ApiParam({ name: 'id', description: '监控ID' })
  async delete(
    @IRequestUser() user: IUserPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return await this.watchService.deleteWatch(user, id);
  }

  @Delete()
  @ApiOperation({
    summary: '批量删除',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    type: BaseApiErrorResponse,
  })
  async deleteAll(
    @IRequestUser() user: IUserPayload,
    @Body('ids') ids: number[],
  ) {
    return await this.watchService.deleteWatchIds(user, ids);
  }

  @Get(':id/record')
  @ApiOperation({
    summary: '监控记录',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    type: BaseApiErrorResponse,
  })
  @ApiParam({ name: 'id', description: '监控ID' })
  async listRecord(
    @IRequestUser() user: IUserPayload,
    @Param('id', ParseIntPipe) id: number,
    @Query() query: QueryWatchDto,
  ) {
    return await this.watchService.listRecord(user, id, query);
  }

  @Get(':id/record/:rid')
  @ApiOperation({
    summary: '监控记录',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    type: BaseApiErrorResponse,
  })
  @ApiParam({ name: 'id', description: '监控ID' })
  @ApiParam({ name: 'rid', description: '监控记录ID' })
  async recordInfo(
    @IRequestUser() user: IUserPayload,
    @Param('id', ParseIntPipe) id: number,
    @Param('rid', ParseIntPipe) rid: number,
  ) {
    return await this.watchService.recordInfo(user, id, rid);
  }

  @Get(':id/record/:rid/reload')
  @ApiOperation({
    summary: '重试监控',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    type: BaseApiErrorResponse,
  })
  @ApiParam({ name: 'id', description: '监控ID' })
  @ApiParam({ name: 'rid', description: '监控记录ID' })
  async reloadRecord(
    @IRequestUser() user: IUserPayload,
    @Param('id', ParseIntPipe) id: number,
    @Param('rid', ParseIntPipe) rid: number,
  ) {
    return await this.watchService.reloadRecord(user, id, rid);
  }
}
