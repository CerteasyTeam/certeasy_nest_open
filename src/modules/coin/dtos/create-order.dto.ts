import { IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateOrderDto {
  @IsNotEmpty({ message: '产品ID不能为空' })
  @ApiProperty({
    description: '产品ID',
    example: '1',
  })
  public podId: number;
}
