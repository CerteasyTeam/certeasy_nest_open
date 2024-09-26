import { IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateWatchIDto {
  @IsNotEmpty({ message: '监控域名不能为空' })
  @ApiProperty({
    description: '监控域名',
    example: 'certeasy.cn',
  })
  public domain: string;

  @IsOptional()
  @ApiPropertyOptional({
    description: '监控ip',
    example: '1',
  })
  public ip?: string;

  @IsOptional()
  @ApiPropertyOptional({
    description: '监控端口',
    example: '443',
  })
  public port?: number;
}
