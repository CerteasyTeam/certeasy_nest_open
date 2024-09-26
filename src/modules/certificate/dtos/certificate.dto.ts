import { Expose } from 'class-transformer';
import { BaseQueryInput } from '@app/common';

export class CertificateInfoDto {
  @Expose()
  public name?: number;
  @Expose()
  public domains?: number;
  @Expose()
  public alias?: number;
  @Expose()
  public type?: number;
  @Expose()
  public authMode?: number;
  @Expose()
  public autoNotify?: number;
  @Expose()
  public autoUpdate?: number;
  @Expose()
  public autoPush?: number;
  @Expose()
  public latestVersionId?: number;
  @Expose()
  public latestValidVersionId?: number;
  @Expose()
  public status?: number;
}

export class QueueCertificateDto extends BaseQueryInput {}
