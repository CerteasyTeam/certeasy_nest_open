import {
  HttpStatus,
  Controller,
  Logger,
  Get,
  Post,
  Put,
  Body,
  Param,
  HttpCode,
  ParseIntPipe,
  Query,
  Res,
  Sse,
  BadRequestException,
  Delete,
} from '@nestjs/common';
import { Response } from 'express';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
// @app
import {
  IRequestUser,
  Public,
  BaseApiErrorResponse,
  SwaggerBaseApiResponse,
} from '@app/common';
import * as path from 'path';
import * as fs from 'fs';
// service
import { CertificateService } from './certificate.service';
// dtos
import {
  CreateCertificateDto,
  QueueCertificateDto,
  QueueCertificateVersionDto,
  UpdateCertificateDto,
  ConfigCertificateDto,
  DeployCertificateDto,
} from './dtos';
// acme logger
import { AcmeClientLogger } from '@app/share/acme/loggers';
import * as _ from 'lodash';

@ApiTags('certificate')
@ApiBearerAuth()
@Controller('certificate')
export class CertificateController {
  // logger
  readonly logger = new Logger(CertificateController.name);

  constructor(
    private readonly certificateService: CertificateService,
    private readonly acmeClientLogger: AcmeClientLogger,
  ) {}

  @Post('')
  @ApiOperation({
    summary: '申请证书',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    type: BaseApiErrorResponse,
  })
  @HttpCode(HttpStatus.OK)
  async create(
    @IRequestUser() user: IUserPayload,
    @Body() data: CreateCertificateDto,
  ) {
    return await this.certificateService.create(user, data);
  }

  @Get('')
  @ApiOperation({
    summary: '证书列表',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    type: BaseApiErrorResponse,
  })
  async list(
    @IRequestUser() user: IUserPayload,
    @Query() query: QueueCertificateDto,
  ) {
    return this.certificateService.list(user, query);
  }

  @Get('version')
  @ApiOperation({
    summary: '证书版本列表',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    type: BaseApiErrorResponse,
  })
  async listVersion(
    @IRequestUser() user: IUserPayload,
    @Query() query: QueueCertificateVersionDto,
  ) {
    return this.certificateService.listVersion(user, query);
  }

  @Get('deploy')
  @ApiOperation({
    summary: '证书部署列表',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    type: BaseApiErrorResponse,
  })
  async listDeploy(
    @IRequestUser() user: IUserPayload,
    @Query() query: QueueCertificateVersionDto,
  ) {
    return this.certificateService.listDeploy(user, query);
  }

  @Get(':id')
  @ApiOperation({
    summary: '证书详情',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    type: BaseApiErrorResponse,
  })
  @ApiParam({ name: 'id', type: Number, description: '证书ID' })
  async info(
    @IRequestUser() user: IUserPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.certificateService.info(user, id);
  }

  @Put(':id')
  @ApiOperation({
    summary: '更新证书',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    type: BaseApiErrorResponse,
  })
  @ApiParam({ name: 'id', type: Number, description: '证书ID' })
  async update(
    @IRequestUser() user: IUserPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() data: UpdateCertificateDto,
  ) {
    return this.certificateService.update(user, id, data);
  }

  @Put(':id/config')
  @ApiOperation({
    summary: '配置证书',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    type: BaseApiErrorResponse,
  })
  @ApiParam({ name: 'id', type: Number, description: '证书ID' })
  async config(
    @IRequestUser() user: IUserPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() data: ConfigCertificateDto,
  ) {
    return this.certificateService.update(user, id, data);
  }

  @Put(':id/:field')
  @ApiOperation({
    summary: '更新证书',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    type: BaseApiErrorResponse,
  })
  @ApiParam({ name: 'id', type: Number, description: '证书ID' })
  @ApiParam({ name: 'field', type: String, description: '证书field' })
  async updateField(
    @IRequestUser() user: IUserPayload,
    @Param('id', ParseIntPipe) id: number,
    @Param('field') field: string,
    @Body() data: UpdateCertificateDto,
  ) {
    // 处理下是否存在字段数据
    if (!_.has(data, field)) {
      throw new BadRequestException('数据异常，无法匹配传递参数');
    }
    return this.certificateService.update(user, id, data);
  }

  @Delete(':id')
  @ApiOperation({
    summary: '删除证书信息',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    type: BaseApiErrorResponse,
  })
  @ApiParam({ name: 'id', type: Number, description: '证书ID' })
  async delete(
    @IRequestUser() user: IUserPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.certificateService.delete(user, id);
  }

  @Get(':id/cloud')
  @ApiOperation({
    summary: '资源列表',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    type: BaseApiErrorResponse,
  })
  @ApiParam({ name: 'id', type: Number, description: '证书ID' })
  async clouds(
    @IRequestUser() user: IUserPayload,
    @Param('id', ParseIntPipe) id: number,
    @Query() query: QueueCertificateVersionDto,
  ) {
    return this.certificateService.listCloud(user, id, query);
  }

  @Get(':id/version')
  @ApiOperation({
    summary: '证书版本列表',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    type: BaseApiErrorResponse,
  })
  @ApiParam({ name: 'id', description: '证书ID' })
  async version(
    @IRequestUser() user: IUserPayload,
    @Param('id', ParseIntPipe) id: number,
    @Query() query: QueueCertificateVersionDto,
  ) {
    return this.certificateService.listCertVersion(user, id, query);
  }

  @Post(':id/version')
  @ApiOperation({
    summary: '创建证书版本',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    type: BaseApiErrorResponse,
  })
  @ApiParam({ name: 'id', description: '证书ID' })
  async createVersion(
    @IRequestUser() user: IUserPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.certificateService.createVersion(user, id);
  }

  @Get(':id/version/:vid')
  @ApiOperation({
    summary: '创建证书版本',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    type: BaseApiErrorResponse,
  })
  @ApiParam({ name: 'id', description: '证书ID' })
  @ApiParam({ name: 'vid', description: '证书详情ID' })
  async versionInfo(
    @IRequestUser() user: IUserPayload,
    @Param('id', ParseIntPipe) id: number,
    @Param('vid', ParseIntPipe) vid: number,
  ) {
    return this.certificateService.versionInfo(user, id, vid);
  }

  @Post(':id/version/:vid/revoke')
  @ApiOperation({
    summary: '吊销证书版本',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    type: BaseApiErrorResponse,
  })
  @ApiParam({ name: 'id', description: '证书ID' })
  @ApiParam({ name: 'vid', description: '证书详情ID' })
  async versionRevoke(
    @IRequestUser() user: IUserPayload,
    @Param('id', ParseIntPipe) id: number,
    @Param('vid', ParseIntPipe) vid: number,
  ) {
    return this.certificateService.versionRevoke(user, id, vid);
  }

  @Get(':id/version/:vid/download')
  @ApiOperation({
    summary: '下载证书版本',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    type: BaseApiErrorResponse,
  })
  @ApiParam({ name: 'id', description: '证书ID' })
  @ApiParam({ name: 'vid', description: '证书详情ID' })
  async versionDownload(
    @IRequestUser() user: IUserPayload,
    @Param('id', ParseIntPipe) id: number,
    @Param('vid', ParseIntPipe) vid: number,
    @Res() res: Response,
  ) {
    //return this.certificateService.versionDownload(user, id, vid);
    // 实现临时文件压缩提供下载
    const { certArchiverFile, fileName } =
      await this.certificateService.versionDownload(user, id, vid);
    const downloadFile = path.join(path.dirname(__dirname), certArchiverFile);

    this.logger.debug('downloadFile:' + downloadFile);
    // 检查文件是否存在
    if (!fs.existsSync(downloadFile)) {
      this.logger.error('证书文件获取失败, 文件不存在');
      res.status(HttpStatus.NOT_FOUND).send('证书文件获取失败，请稍后再试');
      return;
      //throw new NotFoundException('证书文件获取失败，请稍后再试')
    }
    // 设置响应头
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);

    // 创建读取流
    const fileStream = fs.createReadStream(downloadFile);

    // 监听读取流事件
    fileStream.on('error', (error) => {
      console.error('Read stream error:', error);
      res
        .status(HttpStatus.INTERNAL_SERVER_ERROR)
        .send('Internal Server Error');
    });

    // 发送文件给客户端下载
    fileStream.pipe(res);
  }

  @Post(':id/deploy')
  @ApiOperation({
    summary: '证书部署',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    type: BaseApiErrorResponse,
  })
  @ApiParam({ name: 'id', description: '证书ID' })
  async deploy(
    @IRequestUser() user: IUserPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() data: DeployCertificateDto,
  ) {
    return this.certificateService.deploy(user, id, data);
  }

  @Get(':id/deploy')
  @ApiOperation({
    summary: '证书部署记录',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    type: BaseApiErrorResponse,
  })
  @ApiParam({ name: 'id', description: '证书ID' })
  async listCertDeploy(
    @IRequestUser() user: IUserPayload,
    @Param('id', ParseIntPipe) id: number,
    @Query() query: QueueCertificateVersionDto,
  ) {
    return this.certificateService.listCertDeploy(user, id, query);
  }

  @Sse(':id/version/:vid/process')
  @ApiOperation({
    summary: '证书部署记录输出',
  })
  output(
    @Param('id', ParseIntPipe) id: number,
    @Param('vid', ParseIntPipe) vid: number,
  ): Observable<string> {
    return this.acmeClientLogger.getLogs(`process_${id}_${vid}`).pipe(
      map((log) => {
        console.log(`Sending log for ID ${id}: ${log}`); // Debugging statement
        return log;
      }),
    );
  }
}
