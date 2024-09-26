import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class UserInfoDto {
  @Expose()
  @ApiProperty({ description: '用户ID' })
  public id: number;

  @Expose()
  @ApiProperty({ description: '编码' })
  public userCode: string;

  @Expose()
  @ApiProperty({ description: '昵称' })
  public nickName: string;

  @Expose()
  @ApiProperty({ description: '邮箱' })
  public email: string;

  @Expose()
  @ApiProperty({ description: '时间' })
  public createTime: string;
}
