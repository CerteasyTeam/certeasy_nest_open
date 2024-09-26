import { IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateWatchIDto {
  @IsOptional()
  @ApiPropertyOptional({
    description: '别名',
    example: 'watch-xxxxxx',
  })
  public alias?: string;
}
