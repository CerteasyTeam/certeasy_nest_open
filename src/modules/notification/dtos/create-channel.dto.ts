import { IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateChannelIDto {
  @IsNotEmpty({ message: '服务商不能为空' })
  @ApiProperty({
    description: '服务商id',
    example: '1',
  })
  public providerId: number;

  @IsNotEmpty()
  @ApiProperty({
    description: '服务配置',
    example: '{Ali_Key: "LTAI5tRUBa", Ali_Secret: "lk7jX8UziL7HMOIej"}',
  })
  public accessJson: Record<string, any>;
}
