import {
  HttpStatus,
  Logger,
  Controller,
  Get,
  Put,
  Body,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { UserService } from './user.service';
// @app/common
import {
  IRequestUser,
  BaseApiErrorResponse,
  SwaggerBaseApiResponse,
} from '@app/common';
// dtos
import {
  UserInfoDto,
  UpdateEmailDto,
  UpdatePasswdDto,
  QueryUserInvitationDto,
  QueryUserTransactionDto,
} from './dtos';

@ApiTags('user')
@ApiBearerAuth()
@Controller('user')
export class UserController {
  // logger
  readonly logger = new Logger(UserController.name);
  constructor(private readonly userService: UserService) {}

  @Get('me')
  @ApiOperation({
    summary: '个人信息',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: SwaggerBaseApiResponse(UserInfoDto),
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    type: BaseApiErrorResponse,
  })
  async me(@IRequestUser() user: IUserPayload) {
    return await this.userService.userInfo(user);
  }

  @Get('transaction')
  @ApiOperation({
    summary: '费用记录',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: SwaggerBaseApiResponse(UserInfoDto),
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    type: BaseApiErrorResponse,
  })
  async transaction(
    @IRequestUser() user: IUserPayload,
    @Query() query: QueryUserTransactionDto,
  ) {
    return await this.userService.userTransaction(user, query);
  }

  @Get('invitation')
  @ApiOperation({
    summary: '邀请记录',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: SwaggerBaseApiResponse(UserInfoDto),
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    type: BaseApiErrorResponse,
  })
  async invitation(
    @IRequestUser() user: IUserPayload,
    @Query() query: QueryUserInvitationDto,
  ) {
    return await this.userService.userInvitation(user, query);
  }

  @Get('me/coins')
  @ApiOperation({
    summary: '个人余额',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: SwaggerBaseApiResponse(UserInfoDto),
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    type: BaseApiErrorResponse,
  })
  async coins(@IRequestUser() user: IUserPayload) {
    return await this.userService.userCoins(user);
  }

  @Put('email')
  async email(
    @IRequestUser() user: IUserPayload,
    @Body() data: UpdateEmailDto,
  ) {
    return await this.userService.updateEmail(user, data);
  }

  @Put('passwd')
  async passwd(
    @IRequestUser() user: IUserPayload,
    @Body() data: UpdatePasswdDto,
  ) {
    return await this.userService.updatePasswd(user, data);
  }
}
