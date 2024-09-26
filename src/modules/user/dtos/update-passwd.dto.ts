import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { IsNotEmpty } from 'class-validator';

export class UpdatePasswdDto {
  @Expose()
  @IsNotEmpty()
  @ApiProperty({ description: '密码' })
  public passwd: string;

  @Expose()
  @IsNotEmpty()
  @ApiProperty({ description: '新密码' })
  public newPasswd: string;
}
