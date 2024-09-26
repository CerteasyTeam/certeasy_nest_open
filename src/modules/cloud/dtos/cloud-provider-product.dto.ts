import { Expose } from 'class-transformer';
import { BaseQueryInput } from '@app/common';

export class CloudProviderProductInfoDto {
  @Expose()
  public id?: number;
  @Expose()
  public name?: string;
  @Expose()
  public alias?: string;
  @Expose()
  public logo?: string;
  @Expose()
  public status?: number;
}

export class QueryCloudProviderProductDto extends BaseQueryInput {}
