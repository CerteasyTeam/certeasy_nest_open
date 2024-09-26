import { IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class WechatAuthDto {
  @IsNotEmpty({ message: '授权code不能为空' })
  @ApiProperty({
    description: '授权code',
    example: '0b3WHall2xuJce4umqml2DSltY3WHalb',
  })
  public code: string;

  @IsOptional()
  @ApiPropertyOptional({
    description: '登录场景码',
    example: '95lHfmfkYvTPnkpW',
  })
  public scene?: string;

  @IsOptional()
  @ApiPropertyOptional({
    description: '登录邀请码',
    example: '7ebe18a7e92a8aaa',
  })
  public invitation?: string;
}

export class WechatQrcodeDto {
  @IsNotEmpty({ message: '操作action不能为空' })
  @ApiProperty({
    description: '操作action',
    example: 'create',
  })
  public action?: string;
}
