import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';

export class BaseQueryInput {
  @IsOptional()
  @ApiPropertyOptional({
    type: String,
    description: '关键词',
  })
  public keyword: string;

  @IsOptional()
  @ApiPropertyOptional({
    type: Number,
    description: '查询数据量',
    example: 10,
    default: 10,
  })
  public pageSize: number;

  @IsOptional()
  @ApiPropertyOptional({
    type: Number,
    description: '查询页码',
    example: 1,
    default: 1,
  })
  public pageNum: number;

  @IsOptional()
  @ApiPropertyOptional({
    type: String,
    description: '排序字段',
    example: 'id',
    default: 'id',
  })
  public sortBy: string;

  @IsOptional()
  @ApiPropertyOptional({
    type: String,
    description: '排序类型',
    example: 'asc',
    default: 'asc',
  })
  public sortOrder: 'ASC' | 'DESC' | undefined;
}
