import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { BaseQueryInput } from '@app/common';
import { IsOptional } from 'class-validator';

export class UserTransactionDto {
  @Expose()
  @ApiProperty({ description: 'ID' })
  public id: number;

  @Expose()
  @ApiProperty({ description: '类型' })
  public type: number;

  @Expose()
  @ApiProperty({ description: '金币' })
  public coin: number;

  @Expose()
  @ApiProperty({ description: '余额' })
  public afterCoin: number;

  @Expose()
  @ApiProperty({ description: '说明' })
  public remark: string;

  @Expose()
  @ApiProperty({ description: '时间' })
  public createTime: string;
}

export class QueryUserTransactionDto extends BaseQueryInput {
  @IsOptional()
  @ApiPropertyOptional({ description: '开始时间' })
  public startDate?: string;

  @IsOptional()
  @ApiPropertyOptional({ description: '结束时间' })
  public endDate?: string;

  @IsOptional()
  @ApiPropertyOptional({ description: '类型' })
  public type?: string;
}
