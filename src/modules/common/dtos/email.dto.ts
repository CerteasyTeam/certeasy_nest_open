import { IsNotEmpty, IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class EmailDto {
  @IsNotEmpty({ message: '邮箱地址不能为空' })
  @IsEmail({}, { message: '输入邮箱地址错误' })
  @ApiProperty({
    description: '邮箱地址',
    example: 'me@mail.certeasy.cn',
  })
  public email: string;

  @IsNotEmpty({ message: '场景值不能为空' })
  @ApiProperty({
    description: '场景值',
    example: 'signup',
  })
  public scene: string;
}
