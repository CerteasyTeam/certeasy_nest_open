import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
  VirtualColumn,
  OneToOne,
} from 'typeorm';
import { BaseEntity } from '@app/common';
import { cryptoMd5, randomString } from '@app/utils';
import { Expose } from 'class-transformer';
import { WatchRecordEntity } from './';

@Entity('watch')
export class WatchEntity extends BaseEntity {
  @PrimaryGeneratedColumn({ type: 'int', name: 'id' })
  id: number;

  @Expose()
  @Column({ type: 'int', name: 'user_id', comment: '所属用户' })
  userId: number;

  @Expose()
  @Column({ type: 'varchar', name: 'name', comment: '名称' })
  name: string;

  @Expose()
  @Column({ type: 'varchar', name: 'alias', comment: '别名' })
  alias: string;

  @Expose()
  @Column({ type: 'varchar', name: 'error', comment: '错误信息' })
  error: string;

  @Expose()
  @Column({ type: 'varchar', name: 'domain', comment: '域名' })
  domain: string;

  @Expose()
  @Column({ type: 'varchar', name: 'ip', comment: 'ip' })
  ip: string;

  @Expose()
  @Column({ type: 'int', name: 'port' })
  port: number;

  @Expose()
  @Column({ type: 'tinyint', name: 'auto_notify', comment: '自动通知' })
  autoNotify: number;

  @Expose()
  @Column({
    type: 'int',
    name: 'notify_days_in_advance',
    comment: '提前n天通知',
  })
  notifyDaysInAdvance: number;

  @Expose()
  @Column({ type: 'int', name: 'latest_record_id', comment: '最新记录' })
  latestRecordId: number;

  @OneToOne(() => WatchRecordEntity, (watchRecord) => watchRecord.id)
  @JoinColumn({ name: 'latest_record_id' })
  latestRecord: WatchRecordEntity;

  @Expose()
  @Column({ type: 'tinyint', name: 'status' })
  status: number;

  @CreateDateColumn({ type: 'datetime', name: 'create_time' })
  createTime: Date | string;

  @UpdateDateColumn({ type: 'datetime', name: 'update_time' })
  updateTime: Date | string;
  // save才有效
  @BeforeInsert()
  updateName() {
    this.name = `watch-${randomString(16, cryptoMd5(this.domain))}`;
  }

  @OneToMany(() => WatchRecordEntity, (record) => record.watch)
  @JoinColumn({ name: 'id' })
  watchRecords: WatchRecordEntity[];

  @VirtualColumn('varchar', {
    query: (alias) => alias,
  })
  watchCertificateId: string;

  @VirtualColumn('varchar', {
    query: (alias) => alias,
  })
  latestRecordStatus: string;

  @VirtualColumn('varchar', {
    query: (alias) => alias,
  })
  latestRecordTime: string;

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
