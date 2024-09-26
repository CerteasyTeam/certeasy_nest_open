import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { IsEmail, IsNotEmpty } from 'class-validator';

export class UpdateEmailDto {
  @Expose()
  @IsNotEmpty()
  @IsEmail()
  @ApiProperty({ description: '邮箱' })
  public email: string;

  @Expose()
  @IsNotEmpty()
  @ApiProperty({ description: '验证码' })
  public code: string;
}
