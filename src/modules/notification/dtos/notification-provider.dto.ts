import { Expose } from 'class-transformer';
import { BaseQueryInput } from '@app/common';

export class NotificationProviderDto {
  @Expose()
  public id?: number;
  @Expose()
  public name?: number;
  @Expose()
  public status?: number;
}

export class QueryNotificationProviderDto extends BaseQueryInput {}
