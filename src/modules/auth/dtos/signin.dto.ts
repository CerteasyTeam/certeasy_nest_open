import { IsNotEmpty, IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
// @user
import { UserInfoDto } from '../../user/dtos';

export class SigninDto {
  @IsNotEmpty({ message: '邮箱地址不能为空' })
  @IsEmail({}, { message: '邮箱地址不正确' })
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
}

export class SigninOutputDto {
  @Expose()
  @ApiProperty({ description: '用户信息' })
  public user: UserInfoDto;

  @Expose()
  @ApiProperty({ description: 'TOKEN' })
  public token: string;
}

export class SendResetPasswdInputDto {
  @IsNotEmpty({ message: '邮箱地址不能为空' })
  @IsEmail({}, { message: '邮箱地址输入有误' })
  @ApiProperty({
    description: '邮箱地址',
    example: 'me@mail.certeasy.cn',
  })
  public email: string;
}

export class ResetPasswdInputDto {
  @IsNotEmpty({ message: '邮箱地址不能为空' })
  @IsEmail()
  @ApiProperty({
    description: '邮箱地址',
    example: 'me@mail.certeasy.cn',
  })
  public email: string;

  @IsNotEmpty({ message: 'token不能为空' })
  @ApiProperty({
    description: 'token',
    example: '5n54ynw456n7e56num3a556e4nu56m8n',
  })
  public token: string;

  @IsNotEmpty({ message: '密码不能为空' })
  @ApiProperty({
    description: '密码',
    example: '123456',
  })
  public passwd: string;
}
