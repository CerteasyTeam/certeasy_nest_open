import { IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateCertificateDto {
  @IsOptional()
  @ApiPropertyOptional({
    description: '证书别名',
    example: '1',
  })
  public alias?: number;

  @IsOptional()
  @ApiPropertyOptional({
    description: '自动通知',
    example: '1',
  })
  public autoNotify?: number;

  @IsOptional()
  @ApiPropertyOptional({
    description: '提前天数',
    example: '1',
  })
  public notifyDaysInAdvance?: number;

  @IsOptional()
  @ApiPropertyOptional({
    description: '自动更新',
    example: '1',
  })
  public autoUpdate?: number;

  @IsOptional()
  @ApiPropertyOptional({
    description: '提前天数',
    example: '1',
  })
  public updateDaysInAdvance?: number;

  @IsOptional()
  @ApiPropertyOptional({
    description: '自动推送',
    example: '1',
  })
  public autoPush?: number;
}
