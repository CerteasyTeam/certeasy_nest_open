import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { Expose } from 'class-transformer';
import { BaseEntity, DATE_FORMAT } from '@app/common';
// entities
import { CertificateVersionEntity } from '.';
import * as dayjs from 'dayjs';

@Entity('certificate_detail')
export class CertificateDetailEntity extends BaseEntity {
  @PrimaryGeneratedColumn({ type: 'int', name: 'id' })
  id: number;

  @Column({
    type: 'int',
    name: 'certificate_version_id',
    comment: '所属证书版本',
  })
  certificateVersionId: number;

  @OneToOne(() => CertificateVersionEntity, (version) => version.detail)
  @JoinColumn({ name: 'certificate_version_id' })
  certificateVersion: CertificateVersionEntity;

  @Expose()
  @Column({ type: 'json', name: 'subject', comment: '主题信息' })
  subject: any;

  @Expose()
  @Column({ type: 'varchar', name: 'subjectaltname', comment: '别名' })
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
  @Column({ type: 'text', name: 'key', comment: '私钥' })
  key: string;

  @Expose()
  @Column({ type: 'text', name: 'certificate', comment: '证书' })
  certificate: string;

  @Expose()
  @Column({ type: 'text', name: 'issuer_certificate', comment: '签发证书' })
  issuerCertificate: string;

  @Expose()
  @Column({ type: 'tinyint', name: 'status' })
  status: number;

  @CreateDateColumn({ type: 'datetime', name: 'create_time' })
  createTime: Date | string;

  @UpdateDateColumn({ type: 'datetime', name: 'update_time' })
  updateTime: Date | string;
}
