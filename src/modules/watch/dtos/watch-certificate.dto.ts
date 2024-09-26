import { Expose } from 'class-transformer';
import { BaseQueryInput } from '@app/common';

export class WatchCertificateInfoDto {
  @Expose()
  public id?: number;
  @Expose()
  public subject?: any;
  @Expose()
  public subjectaltname?: string;
  @Expose()
  public bits?: number;
  @Expose()
  public serialNumber?: string;
  @Expose()
  public issuer?: any;
  @Expose()
  public modulus?: string;
  @Expose()
  public pubkey?: string;
  @Expose()
  public exponent?: string;
  @Expose()
  public fingerprint?: string;
  @Expose()
  public fingerprint256?: string;
  @Expose()
  public validFrom?: string;
  @Expose()
  public validTo?: string;
  @Expose()
  public revokedTime?: string;
  @Expose()
  public status?: number;
  @Expose()
  public certificateInPem?: string;
  @Expose()
  public issuerCertificateInPem?: string;
}

export class QueryWatchCertificateDto extends BaseQueryInput {}
