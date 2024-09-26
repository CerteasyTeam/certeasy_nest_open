import { Expose } from 'class-transformer';
import { BaseQueryInput } from '@app/common';

export class CertificateVersionInfoDto {
  @Expose()
  public certificateId?: number;
  @Expose()
  public error?: string;
  @Expose()
  public retryTimes?: number;
  @Expose()
  public expiredTime?: string;
  @Expose()
  public revokedTime?: string;
  @Expose()
  public status?: number;
}

export class QueueCertificateVersionDto extends BaseQueryInput {}
