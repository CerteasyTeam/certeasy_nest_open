import { IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateCloudFieldDto {
  @IsOptional({ message: '服务商不能为空' })
  @ApiPropertyOptional({
    description: '服务商id',
    example: '1',
  })
  public providerId?: number;

  @IsOptional({ message: '别名不能为空' })
  @ApiPropertyOptional({
    description: '别名',
    example: '1',
  })
  public alias?: number;

  @IsOptional()
  @ApiPropertyOptional({
    description: '服务配置',
    example: '{Ali_Key: "LTAI5tRUBa", Ali_Secret: "lk7jX8UziL7HMOIej"}',
  })
  public accessJson?: Record<string, any>;
}
