import { IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateConfigIDto {
  @IsOptional()
  @ApiPropertyOptional({
    description: '启用状态',
    example: '1',
  })
  public notificationEnabled?: number;

  @IsOptional()
  @ApiPropertyOptional({
    description: '渠道ids',
    example: '[1,2,3,4,5]',
  })
  public associatedChannelIds?: Record<number, any>;
}
