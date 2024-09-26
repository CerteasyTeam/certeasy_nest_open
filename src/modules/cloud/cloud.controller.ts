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
import {
  BaseApiErrorResponse,
  EmptyResponseType,
  IRequestUser,
  Public,
  SwaggerBaseApiResponse,
} from '@app/common';
// service
import { CloudService } from './cloud.service';
// dtos
import {
  QueryCloudDto,
  CreateCloudIDto,
  UpdateCloudIDto,
  UpdateCloudFieldDto,
  QueryCloudDeployDto,
  CheckCloudIDto,
} from './dtos';

@ApiTags('cloud')
@Controller('cloud')
export class CloudController {
  // logger
  readonly logger = new Logger(CloudController.name);

  constructor(private readonly cloudService: CloudService) {}

  @Get('provider')
  @ApiOperation({
    summary: 'Cloud Provider 列表',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    type: BaseApiErrorResponse,
  })
  async listProvider(
    @IRequestUser() user: IUserPayload,
    @Query() query: QueryCloudDto,
  ) {
    return await this.cloudService.listProvider(user, query);
  }

  @Get('')
  @ApiOperation({
    summary: 'Cloud列表',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    type: BaseApiErrorResponse,
  })
  async list(
    @IRequestUser() user: IUserPayload,
    @Query() query: QueryCloudDto,
  ) {
    return await this.cloudService.list(user, query);
  }

  @Post('')
  @ApiOperation({
    summary: '增加cloud配置',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    type: BaseApiErrorResponse,
  })
  async create(
    @IRequestUser() user: IUserPayload,
    @Body() data: CreateCloudIDto,
  ) {
    return await this.cloudService.create(user, data);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'cloud详情',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    type: BaseApiErrorResponse,
  })
  @ApiParam({ name: 'id', description: 'Cloud id' })
  async info(
    @IRequestUser() user: IUserPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return await this.cloudService.info(user, id);
  }

  @Put(':id')
  @ApiOperation({
    summary: '更新cloud详情',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    type: BaseApiErrorResponse,
  })
  @ApiParam({ name: 'id', description: 'Cloud id' })
  async update(
    @IRequestUser() user: IUserPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() data: UpdateCloudIDto,
  ) {
    return await this.cloudService.update(user, id, data);
  }

  @Delete(':id')
  @ApiOperation({
    summary: '删除cloud详情',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    type: BaseApiErrorResponse,
  })
  @ApiParam({ name: 'id', description: 'Cloud id' })
  async delete(
    @IRequestUser() user: IUserPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return await this.cloudService.delete(user, id);
  }

  @Get(':id/deploy')
  @ApiOperation({
    summary: '部署列表',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    type: BaseApiErrorResponse,
  })
  @ApiParam({ name: 'id', description: 'Cloud id' })
  async deployList(
    @IRequestUser() user: IUserPayload,
    @Param('id', ParseIntPipe) id: number,
    @Query() query: QueryCloudDeployDto,
  ) {
    return await this.cloudService.deployList(user, id, query);
  }

  @Post(':id/deploy')
  @ApiOperation({
    summary: '云资源部署',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    type: BaseApiErrorResponse,
  })
  @ApiParam({ name: 'id', description: 'Cloud id' })
  async deploy(
    @IRequestUser() user: IUserPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return await this.cloudService.deploy(user, id);
  }

  @Put(':id/:field')
  @ApiOperation({
    summary: '更新cloud详情',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    type: BaseApiErrorResponse,
  })
  @ApiParam({ name: 'id', description: 'Cloud id' })
  @ApiParam({ name: 'field', description: 'Cloud field' })
  async updateField(
    @IRequestUser() user: IUserPayload,
    @Param('id', ParseIntPipe) id: number,
    @Param('field') field: string,
    @Body() data: UpdateCloudFieldDto,
  ) {
    // 处理下是否存在字段数据
    if (!_.has(data, field)) {
      throw new BadRequestException('数据异常，无法匹配传递参数');
    }
    return await this.cloudService.update(user, id, data);
  }

  @Post('check')
  @ApiOperation({
    summary: 'cloud授权检查',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    type: BaseApiErrorResponse,
  })
  async check(
    @IRequestUser() user: IUserPayload,
    @Body() data: CheckCloudIDto,
  ) {
    return await this.cloudService.check(user, data);
  }
}
