import {
  HttpStatus,
  Controller,
  Logger,
  Get,
  Post,
  Put,
  Delete,
  Body,
  HttpCode,
  Query,
  Param,
  ParseIntPipe,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import * as _ from 'lodash';
// @app
import { BaseApiErrorResponse, IRequestUser } from '@app/common';
// service
import { DnsService } from './dns.service';
// dtos
import {
  QueryDnsDto,
  CreateDnsIDto,
  UpdateDnsIDto,
  QueryDnsProviderDto,
  CheckDnsIDto,
  UpdateFieldDto,
} from './dtos';

@ApiTags('dns')
@Controller('dns')
export class DnsController {
  // logger
  readonly logger = new Logger(DnsController.name);

  constructor(private readonly dnsService: DnsService) {}

  @Get('provider')
  @ApiOperation({
    summary: 'DNS provider列表',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    type: BaseApiErrorResponse,
  })
  async provider(
    @IRequestUser() user: IUserPayload,
    @Query() query: QueryDnsProviderDto,
  ) {
    return await this.dnsService.provider(user, query);
  }

  @Get('')
  @ApiOperation({
    summary: 'DNS列表',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    type: BaseApiErrorResponse,
  })
  async list(@IRequestUser() user: IUserPayload, @Query() query: QueryDnsDto) {
    return await this.dnsService.list(user, query);
  }

  @Post('')
  @ApiOperation({
    summary: '增加dns配置',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    type: BaseApiErrorResponse,
  })
  @HttpCode(200)
  async create(
    @IRequestUser() user: IUserPayload,
    @Body() data: CreateDnsIDto,
  ) {
    return await this.dnsService.create(user, data);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'dns详情',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    type: BaseApiErrorResponse,
  })
  @ApiParam({ name: 'id', description: 'DNS id' })
  async info(
    @IRequestUser() user: IUserPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return await this.dnsService.info(user, id);
  }

  @Put(':id')
  @ApiOperation({
    summary: '更新dns详情',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    type: BaseApiErrorResponse,
  })
  @ApiParam({ name: 'id', description: 'DNS id' })
  async update(
    @IRequestUser() user: IUserPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() data: UpdateDnsIDto,
  ) {
    return await this.dnsService.update(user, id, data);
  }

  @Put(':id/:field')
  @ApiOperation({
    summary: '更新dns详情',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    type: BaseApiErrorResponse,
  })
  @ApiParam({ name: 'id', description: 'DNS id' })
  @ApiParam({ name: 'field', description: 'DNS field' })
  async updateField(
    @IRequestUser() user: IUserPayload,
    @Param('id', ParseIntPipe) id: number,
    @Param('field') field: string,
    @Body() data: UpdateFieldDto,
  ) {
    // 处理下是否存在字段数据
    if (!_.has(data, field)) {
      throw new BadRequestException('数据异常，无法匹配传递参数');
    }
    return await this.dnsService.update(user, id, data);
  }

  @Delete(':id')
  @ApiOperation({
    summary: '删除dns授权',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    type: BaseApiErrorResponse,
  })
  @ApiParam({ name: 'id', description: 'DNS id' })
  async delete(
    @IRequestUser() user: IUserPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return await this.dnsService.delete(user, id);
  }

  @Post('check')
  @ApiOperation({
    summary: 'dns授权检查',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    type: BaseApiErrorResponse,
  })
  @HttpCode(200)
  async check(@IRequestUser() user: IUserPayload, @Body() data: CheckDnsIDto) {
    return await this.dnsService.check(user, data);
  }
}
