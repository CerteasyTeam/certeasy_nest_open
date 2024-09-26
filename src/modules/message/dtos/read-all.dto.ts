import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { IsNotEmpty } from 'class-validator';

export class ReadAllDto {
  @IsNotEmpty({ message: 'ids不能为空' })
  @Expose()
  @ApiProperty({ description: '选择ids' })
  public ids: number[];
}
