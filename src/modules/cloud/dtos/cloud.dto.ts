import { Expose } from 'class-transformer';
import { BaseQueryInput } from '@app/common';

export class CloudInfoDto {
  @Expose()
  public userId?: number;
  @Expose()
  public providerId?: number;
  @Expose()
  public name?: number;
  @Expose()
  public alias?: number;
  @Expose()
  public accessJson?: any;
  @Expose()
  public status?: number;
}

export class QueryCloudDto extends BaseQueryInput {}
