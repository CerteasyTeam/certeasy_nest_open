import {
  HttpStatus,
  Logger,
  Controller,
  Get,
  Put,
  Delete,
  Query,
  Body,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
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
import { MessageService } from './message.service';
// dtos
import { ReadAllDto } from './dtos';

@ApiTags('message')
@ApiBearerAuth()
@Controller('message')
export class MessageController {
  // logger
  readonly logger = new Logger(MessageController.name);
  constructor(private readonly messageService: MessageService) {}

  @Get()
  @ApiOperation({
    summary: '消息列表',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    type: BaseApiErrorResponse,
  })
  async list(
    @IRequestUser() user: IUserPayload,
    @Query() query: BaseQueryInput,
  ) {
    return this.messageService.list(user, query);
  }

  @Get(':id')
  @ApiOperation({
    summary: '消息详情',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    type: BaseApiErrorResponse,
  })
  @ApiParam({ name: 'id', type: Number, description: '消息ID' })
  async info(
    @IRequestUser() user: IUserPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.messageService.info(user, id);
  }

  @Put('')
  @ApiOperation({
    summary: '消息已读',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    type: BaseApiErrorResponse,
  })
  async read(@IRequestUser() user: IUserPayload, @Body() data: ReadAllDto) {
    return this.messageService.readIds(user, data);
  }

  @Delete('')
  @ApiOperation({
    summary: '删除消息',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    type: BaseApiErrorResponse,
  })
  async delete(@IRequestUser() user: IUserPayload, @Body() data: ReadAllDto) {
    return this.messageService.deleteIds(user, data);
  }
}
