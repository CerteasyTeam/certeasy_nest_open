import { Expose } from 'class-transformer';
import { BaseQueryInput } from '@app/common';

export class CloudDeployInfoDto {
  @Expose()
  public id?: number;
  @Expose()
  public error?: string;
  @Expose()
  public status?: number;
}

export class QueryCloudDeployDto extends BaseQueryInput {}
