import { Expose } from 'class-transformer';
import { BaseQueryInput } from '@app/common';

export class NotificationChannelDto {
  @Expose()
  public id?: number;
  @Expose()
  public name?: string;
  @Expose()
  public alias?: string;
  @Expose()
  public accessJson?: any;
  @Expose()
  public status?: number;
}

export class QueryNotificationChannelDto extends BaseQueryInput {}
