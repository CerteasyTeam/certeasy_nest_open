import { IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class DeployCertificateDto {
  @IsOptional()
  @ApiPropertyOptional({
    description: '关联资源数据',
    example: '1',
  })
  public associatedCloudIds?: any;
}
