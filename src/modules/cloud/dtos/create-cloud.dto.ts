import {
  ArrayNotEmpty,
  IsArray,
  IsNotEmpty,
  IsObject,
  IsNotEmptyObject,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCloudIDto {
  @IsNotEmpty({ message: '服务商不能为空' })
  @ApiProperty({
    description: '服务商id',
    example: '1',
  })
  public providerId: number;

  @IsNotEmpty({ message: '服务商产品不能为空' })
  @ApiProperty({
    description: '服务商产品id',
    example: '1',
  })
  public providerProductId: number;

  @IsObject({ message: '服务配置数据错误' })
  @IsNotEmptyObject({ nullable: false })
  @IsNotEmpty({ message: '服务配置不能为空' })
  @ApiProperty({
    description: '服务配置',
    example: '{Ali_Key: "LTAI5tRUBa", Ali_Secret: "lk7jX8UziL7HMOIej"}',
  })
  public accessJson: Record<string, any>;

  @IsNotEmpty({ message: '关联证书不能为空' })
  @ApiProperty({
    description: '关联证书id',
    example: '[1,2,3]',
  })
  @IsArray({ message: '关联证书数据错误' })
  @ArrayNotEmpty({ message: '关联证书不能为空' })
  public certificateIds: number[];
}
