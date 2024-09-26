import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  VirtualColumn,
} from 'typeorm';
import { WatchEntity, WatchCertificateEntity } from './';
import { Expose } from 'class-transformer';
import { BaseEntity } from '@app/common';

@Entity('watch_record')
export class WatchRecordEntity extends BaseEntity {
  @PrimaryGeneratedColumn({ type: 'int', name: 'id' })
  id: number;

  @Expose()
  @Column({ type: 'int', name: 'watch_id', comment: '监听id' })
  watchId: number;

  @ManyToOne(() => WatchEntity, (watch) => watch.id)
  @JoinColumn({ name: 'watch_id' })
  watch: WatchEntity;

  @Expose()
  @Column({ type: 'int', name: 'watch_certificate_id', comment: '监听证书id' })
  watchCertificateId: number;

  @ManyToOne(() => WatchCertificateEntity, (certificate) => certificate.id)
  @JoinColumn({ name: 'watch_certificate_id' })
  certificate: WatchCertificateEntity;

  @Expose()
  @Column({ type: 'varchar', name: 'ocsp_status', comment: 'ocspStatus' })
  ocspStatus: string;

  @Expose()
  @Column({ type: 'varchar', name: 'error', comment: '错误信息' })
  error: string;

  @Expose()
  @Column({ type: 'tinyint', name: 'retry_times', comment: '从实次数' })
  retryTimes: number;

  @Expose()
  @Column({ type: 'tinyint', name: 'status' })
  status: number;

  @CreateDateColumn({ type: 'datetime', name: 'create_time' })
  createTime: Date | string;

  @UpdateDateColumn({ type: 'datetime', name: 'update_time' })
  updateTime: Date | string;

  @VirtualColumn('varchar', {
    query: (alias) => alias,
    transformer: {
      to: (value: string) => value,
      from: (value: string) => {
        const parseValue = value ? JSON.parse(value) : { O: '--' };
        return parseValue['O'];
      },
    },
  })
  issuer: string;

  @VirtualColumn('varchar', {
    query: (alias) => alias,
  })
  expiredTime: string;

  @VirtualColumn('varchar', {
    query: (alias) => alias,
  })
  revokedTime: string;
}
