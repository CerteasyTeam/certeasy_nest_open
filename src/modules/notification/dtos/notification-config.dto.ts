import { Expose } from 'class-transformer';
import { BaseQueryInput } from '@app/common';

export class NotificationConfigDto {
  @Expose()
  public id?: number;
  @Expose()
  public name?: number;
  @Expose()
  public status?: number;
}

export class QueryNotificationConfigDto extends BaseQueryInput {}
