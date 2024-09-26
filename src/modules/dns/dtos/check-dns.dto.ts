import { IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CheckDnsIDto {
  @IsOptional()
  @ApiPropertyOptional({
    description: '服务商id',
    example: '1',
  })
  public providerId?: number;

  @IsOptional()
  @ApiPropertyOptional({
    description: '配置id',
    example: '1',
  })
  public providerServerId?: number;

  @IsNotEmpty()
  @ApiProperty({
    description: '服务配置',
    example: '{Ali_Key: "LTAI5tRUBa", Ali_Secret: "lk7jX8UziL7HMOIej"}',
  })
  public accessJson: Record<string, any>;

  @IsNotEmpty({ message: '域名类型不能为空' })
  @ApiProperty({
    description: '域名类型 1 单域名 2 多域名 3 泛域名',
    example: 'SINGLE',
  })
  public type: string;

  @IsNotEmpty({ message: '域名信息不能为空' })
  @ApiProperty({
    description: '域名信息',
    example: '["*.certeasy.cn"]',
  })
  public domains: string[];
}
