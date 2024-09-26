import { IsNotEmpty, IsEmail, IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SignupDto {
  @IsNotEmpty({ message: '邮箱地址不能为空' })
  @IsEmail()
  @ApiProperty({
    description: '邮箱地址',
    example: 'me@mail.certeasy.cn',
  })
  public email: string;

  @IsNotEmpty({ message: '密码不能为空' })
  @ApiProperty({
    description: '密码',
    example: '123456',
  })
  public passwd: string;

  @IsNotEmpty({ message: '验证码不能为空' })
  @ApiProperty({
    description: '验证码',
    example: '888888',
  })
  public code: string;

  @IsOptional()
  @ApiProperty({
    description: '邀请码',
    example: 'fh98bgnj5setjnm86k',
  })
  public invite?: string;
}
