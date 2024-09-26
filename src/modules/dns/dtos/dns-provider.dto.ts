import { Expose } from 'class-transformer';
import { BaseQueryInput } from '@app/common';

export class DnsProviderInfoDto {
  @Expose()
  public id?: number;
  @Expose()
  public name?: string;
  @Expose()
  public logo?: number;
  @Expose()
  public configJson?: any;
  @Expose()
  public status?: number;
}

export class QueryDnsProviderDto extends BaseQueryInput {}
