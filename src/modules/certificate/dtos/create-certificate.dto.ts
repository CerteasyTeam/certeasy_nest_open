import { IsNotEmpty, IsOptional, Validate } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArrayUniqueValidate, IsVerifyDomainValidate } from '@app/common';

export class CreateCertificateDto {
  @IsNotEmpty({ message: '认证机构不能为空' })
  @ApiProperty({
    description: '认证机构 letsencrypt google zerossl',
    example: 'letsencrypt',
  })
  public certAgency: string;

  @IsNotEmpty({ message: '申请类型不能为空' })
  @ApiProperty({
    description: '申请类型 1 单域名 2 多域名 3 泛域名',
    example: '1',
  })
  public type: number;

  @IsNotEmpty({ message: '验证模式不能为空' })
  @ApiProperty({
    description: '验证模式 1 file 2 file-alias 3 dns 4 dns-alias',
    example: '1',
  })
  public authMode: number;

  @IsNotEmpty({ message: '证书域名不能为空' })
  @ApiProperty({
    description: '申请域名',
    example: `['*.certeasy.cn']`,
  })
  @Validate(IsArrayUniqueValidate, {
    message: '证书域名重复了，请检查后再提交',
  })
  @Validate(IsVerifyDomainValidate, {
    message: '提交域名信息不符合要求，请检查后再提交',
  })
  public domains: Record<string, any>;

  @IsOptional()
  @ApiPropertyOptional({
    description: 'DNS服务',
    example: `1`,
  })
  public dnsServerId: number;

  @IsOptional()
  @ApiPropertyOptional({
    description: 'DNS服务商',
    example: `1`,
  })
  public dnsProviderId: number;

  @IsOptional()
  @ApiPropertyOptional({
    description: 'DNS服务配置数据',
    example: `1`,
  })
  public dnsServerAccessJson: Record<string, any>;
}
