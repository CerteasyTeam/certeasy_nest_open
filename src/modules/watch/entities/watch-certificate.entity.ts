import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Expose } from 'class-transformer';
import { BaseEntity, DATE_FORMAT } from '@app/common';
import * as dayjs from 'dayjs';

@Entity('watch_certificate')
export class WatchCertificateEntity extends BaseEntity {
  @PrimaryGeneratedColumn({ type: 'int', name: 'id' })
  id: number;

  @Expose()
  @Column({ type: 'json', name: 'subject', comment: '主题信息' })
  subject: any;

  @Expose()
  @Column({ type: 'text', name: 'subjectaltname', comment: '别名' })
  subjectaltname: string;

  @Expose()
  @Column({ type: 'int', name: 'bits', comment: 'bits长度' })
  bits: number;

  @Expose()
  @Column({ type: 'varchar', name: 'serial_number', comment: '序列号' })
  serialNumber: string;

  @Expose()
  @Column({ type: 'json', name: 'issuer', comment: '签发信息' })
  issuer: any;

  @Expose()
  @Column({
    type: 'text',
    name: 'issuer_certificate_in_pem',
    comment: '签发证书pem',
  })
  issuerCertificateInPem: string;

  @Expose()
  @Column({ type: 'text', name: 'modulus', comment: 'modules' })
  modulus: string;

  @Expose()
  @Column({ type: 'text', name: 'pubkey', comment: 'pubkey' })
  pubkey: string;

  @Expose()
  @Column({ type: 'varchar', name: 'exponent', comment: 'exponent' })
  exponent: string;

  @Expose()
  @Column({ type: 'varchar', name: 'fingerprint', comment: 'SHA1指纹' })
  fingerprint: string;

  @Expose()
  @Column({ type: 'varchar', name: 'fingerprint256', comment: 'SHA256指纹' })
  fingerprint256: string;

  @Expose()
  @Column({
    type: 'datetime',
    name: 'valid_from',
    comment: '颁发日期',
    transformer: {
      to: (value: any) => value,
      from: (value: any) => (value ? dayjs(value).format(DATE_FORMAT) : null),
    },
  })
  validFrom: Date | string;

  @Expose()
  @Column({
    type: 'datetime',
    name: 'valid_to',
    comment: '截至日期',
    transformer: {
      to: (value: any) => value,
      from: (value: any) => (value ? dayjs(value).format(DATE_FORMAT) : null),
    },
  })
  validTo: Date | string;

  @Expose()
  @Column({
    type: 'datetime',
    name: 'revoked_time',
    comment: '吊销日期',
    transformer: {
      to: (value: any) => value,
      from: (value: any) => (value ? dayjs(value).format(DATE_FORMAT) : null),
    },
  })
  revokedTime: Date | string;

  @Expose()
  @Column({ type: 'text', name: 'certificate_in_pem', comment: '证书pem' })
  certificateInPem: string;

  @Expose()
  @Column({ type: 'tinyint', name: 'status' })
  status: number;

  @CreateDateColumn({ type: 'datetime', name: 'create_time' })
  createTime: Date | string;

  @UpdateDateColumn({ type: 'datetime', name: 'update_time' })
  updateTime: Date | string;
}
