import { IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateChannelIDto {
  @IsOptional({ message: '服务商不能为空' })
  @ApiPropertyOptional({
    description: '服务商id',
    example: '1',
  })
  public providerId?: number;

  @IsNotEmpty()
  @ApiProperty({
    description: '服务配置',
    example: '{Ali_Key: "LTAI5tRUBa", Ali_Secret: "lk7jX8UziL7HMOIej"}',
  })
  public accessJson: Record<string, any>;
}

export class UpdateChannelFieldDto {
  @IsOptional()
  @ApiPropertyOptional({
    description: '名称',
    example: '1',
  })
  public name?: string;

  @IsOptional()
  @ApiPropertyOptional({
    description: 'alias',
    example: 'notification-xxxxxx',
  })
  public alias?: string;
}
