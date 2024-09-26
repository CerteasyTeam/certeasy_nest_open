import { Expose } from 'class-transformer';
import { BaseQueryInput } from '@app/common';

export class WatchInfoDto {
  @Expose()
  public name?: number;
  @Expose()
  public alias?: number;
  @Expose()
  public domain?: number;
  @Expose()
  public ip?: number;
  @Expose()
  public port?: number;
  @Expose()
  public autoNotify?: number;
  @Expose()
  public latestRecordId?: number;
  @Expose()
  public status?: number;
}

export class QueryWatchDto extends BaseQueryInput {}
