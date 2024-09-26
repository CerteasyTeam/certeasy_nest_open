import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { BaseQueryInput } from '@app/common';

export class UserInvitationDto {
  @Expose()
  @ApiProperty({ description: 'ID' })
  public id: number;

  @Expose()
  @ApiProperty({ description: '邀请用户ID' })
  public userId: number;

  @Expose()
  @ApiProperty({ description: '注册用户ID' })
  public signupId: number;

  @Expose()
  @ApiProperty({ description: '奖励金币' })
  public coin: number;

  @Expose()
  @ApiProperty({ description: '时间' })
  public createTime: string;
}

export class QueryUserInvitationDto extends BaseQueryInput {}
