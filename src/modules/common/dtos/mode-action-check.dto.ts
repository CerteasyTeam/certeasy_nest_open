import { IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ModeActionCheckDto {
  @IsNotEmpty({ message: '域名不能为空' })
  @ApiProperty({
    description: '域名',
    example: `['*.certeasy.cn']`,
  })
  public domains: string[];
}
