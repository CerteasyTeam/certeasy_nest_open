import { Expose } from 'class-transformer';
import { BaseQueryInput } from '@app/common';

export class WatchRecordInfoDto {
  @Expose()
  public id?: number;
  @Expose()
  public watchId?: number;
  @Expose()
  public watchCertificateId?: number;
  @Expose()
  public ocspStatus?: string;
  @Expose()
  public error?: string;
  @Expose()
  public retryTimes?: number;
  @Expose()
  public status?: number;
}

export class QueryWatchRecordDto extends BaseQueryInput {}
