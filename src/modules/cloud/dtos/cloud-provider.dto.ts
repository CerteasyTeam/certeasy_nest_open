import { Expose } from 'class-transformer';
import { BaseQueryInput } from '@app/common';

export class CloudProviderInfoDto {
  @Expose()
  public id?: number;
  @Expose()
  public name?: string;
  @Expose()
  public logo?: string;
  @Expose()
  public status?: number;
}

export class QueryCloudProviderDto extends BaseQueryInput {}
