import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Expose } from 'class-transformer';
import * as dayjs from 'dayjs';
import { BaseEntity, DATE_FORMAT } from '@app/common';
// entities
import { CertificateEntity, CertificateDetailEntity } from '.';

@Entity('certificate_version')
export class CertificateVersionEntity extends BaseEntity {
  @PrimaryGeneratedColumn({ type: 'int', name: 'id' })
  id: number;

  @Column({ type: 'int', name: 'certificate_id', comment: '所属证书' })
  certificateId: number;

  @OneToOne(() => CertificateEntity)
  @JoinColumn({ name: 'certificate_id' })
  certificate: CertificateEntity;

  @OneToOne(
    () => CertificateDetailEntity,
    (detail) => detail.certificateVersion,
  )
  detail: CertificateDetailEntity;

  @Expose()
  @Column({ type: 'varchar', name: 'error', comment: '错误信息' })
  error: string;

  @Column({ type: 'int', name: 'retry_times', comment: '重试次数' })
  retryTimes: string;

  @Expose()
  @Column({
    type: 'datetime',
    name: 'expired_time',
    comment: '过期时间',
    transformer: {
      to: (value: any) => value,
      from: (value: any) => (value ? dayjs(value).format(DATE_FORMAT) : null),
    },
  })
  expiredTime: Date | string;

  @Expose()
  @Column({
    type: 'datetime',
    name: 'revoked_time',
    comment: '吊销时间',
    transformer: {
      to: (value: any) => value,
      from: (value: any) => (value ? dayjs(value).format(DATE_FORMAT) : null),
    },
  })
  revokedTime: Date | string;

  @Expose()
  @Column({ type: 'tinyint', name: 'status' })
  status: number;

  @CreateDateColumn({ type: 'datetime', name: 'create_time' })
  createTime: Date | string;

  @UpdateDateColumn({ type: 'datetime', name: 'update_time' })
  updateTime: Date | string;
}
