import {
  HttpStatus,
  Controller,
  Logger,
  Get,
  Post,
  Query,
  Body,
  HttpCode,
  Param,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
// @app
import {
  BaseApiErrorResponse,
  EmptyResponseType,
  IgnoreLogging,
  Public,
  SwaggerBaseApiResponse,
} from '@app/common';
// dtos
import {
  SigninDto,
  SignupDto,
  SigninOutputDto,
  ResetPasswdInputDto,
  SendResetPasswdInputDto,
  WechatAuthDto,
  WechatQrcodeDto,
} from './dtos';
import { AuthService } from './auth.service';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  // logger
  readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  @Post('/wechat/:prod')
  @Public()
  @ApiOperation({
    summary: '微信授权',
  })
  @ApiParam({ name: 'prod', type: String, description: 'prod' })
  async wechat(@Param('prod') prod: string, @Body() data: WechatAuthDto) {
    return await this.authService.wechat(prod, data);
  }

  @Get('/wechat/:scene')
  @Public()
  @IgnoreLogging()
  @ApiOperation({
    summary: '扫码登录',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: SwaggerBaseApiResponse(EmptyResponseType),
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    type: BaseApiErrorResponse,
  })
  @HttpCode(HttpStatus.OK)
  @ApiParam({ name: 'scene', type: String, description: 'scene' })
  async qrcode(@Param('scene') scene: string, @Query() query: WechatQrcodeDto) {
    return await this.authService.qrcode(scene, query);
  }

  @Post('/oauth/:app')
  @Public()
  @ApiOperation({
    summary: 'Oauth',
  })
  @ApiParam({ name: 'app', type: String, description: 'app' })
  async oauth(@Param('app') app: string, @Body() data: any) {
    //'6dc1f8bbd707fc3e335b'
    return await this.authService.oauth(app, data);
  }

  @Post('signin')
  @Public()
  @ApiOperation({
    summary: '登录接口',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: SwaggerBaseApiResponse(SigninOutputDto),
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    type: BaseApiErrorResponse,
  })
  @HttpCode(HttpStatus.OK)
  async signin(@Body() data: SigninDto): Promise<SigninOutputDto> {
    return await this.authService.signin(data);
  }

  @Post('signup')
  @Public()
  @ApiOperation({
    summary: '注册接口',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: SwaggerBaseApiResponse(EmptyResponseType),
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    type: BaseApiErrorResponse,
  })
  @HttpCode(HttpStatus.OK)
  async signup(@Body() data: SignupDto) {
    return await this.authService.signup(data);
  }

  @Get('urls')
  @Public()
  @ApiOperation({
    summary: '授权链接',
  })
  @HttpCode(HttpStatus.OK)
  async urls() {
    return await this.authService.oauthUrls();
  }

  @Post('reset/valid')
  @Public()
  @ApiOperation({
    summary: '发送重置邮件',
  })
  async sendResetEMail(@Body() data: SendResetPasswdInputDto) {
    return await this.authService.sendResetEMail(data);
  }

  @Post('reset/password')
  @Public()
  @ApiOperation({
    summary: '重置密码',
  })
  @HttpCode(HttpStatus.OK)
  async resetPasswd(@Body() data: ResetPasswdInputDto) {
    return await this.authService.resetPasswd(data);
  }
}
