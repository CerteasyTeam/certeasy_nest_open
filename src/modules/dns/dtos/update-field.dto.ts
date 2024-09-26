import { IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateFieldDto {
  @IsOptional()
  @ApiPropertyOptional({
    description: '别名',
    example: 'dns-xxxx',
  })
  public alias?: number;
}
