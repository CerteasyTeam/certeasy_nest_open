import {
  HttpStatus,
  Controller,
  Logger,
  Get,
  Post,
  Body,
  Param,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
// @app
import { Public, BaseApiErrorResponse, IRequestUser } from '@app/common';
// service
import { CommonService } from './common.service';
import { ValidationService } from '@app/share';
// dtos
import { EmailDto, ModeActionCheckDto } from './dtos';
import { UserService } from '@app/modules/user/user.service';

@ApiTags('common')
@Controller('common')
export class CommonController {
  // logger
  readonly logger = new Logger(CommonController.name);

  constructor(
    private readonly commonService: CommonService,
    private readonly userService: UserService,
    private readonly validationService: ValidationService,
  ) {}

  @Post('email')
  @Public()
  @ApiOperation({
    summary: '发送验证码',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    type: BaseApiErrorResponse,
  })
  @HttpCode(HttpStatus.OK)
  async email(@Body() body: EmailDto) {
    // 检查场景 signup / email 需要验证存在
    if (['signup', 'email'].includes(body?.scene)) {
      await this.userService.checkEmailExist(body.email);
    }
    await this.validationService.send(body.scene || 'signup', body.email);
    return body;
  }

  @Get('config')
  @Public()
  @ApiOperation({
    summary: '获取系统配置',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    type: BaseApiErrorResponse,
  })
  async config() {
    return await this.commonService.loadConfig();
  }

  @Get('overview')
  @ApiOperation({
    summary: '获取信息总览',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    type: BaseApiErrorResponse,
  })
  async overview(@IRequestUser() user: IUserPayload) {
    return await this.commonService.dataOverview(user);
  }

  @Post(':mode/:action/check')
  @ApiOperation({
    summary: '域名所有权校验',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    type: BaseApiErrorResponse,
  })
  @ApiParam({ name: 'mode', description: 'mode name' })
  @ApiParam({ name: 'action', description: 'action name' })
  async modeActionCheck(
    @IRequestUser() user: IUserPayload,
    @Param('mode') mode: string,
    @Param('action') action: string,
    @Body() data: ModeActionCheckDto,
  ) {
    return await this.commonService.modeActionCheck(user, mode, action, data);
  }
}
