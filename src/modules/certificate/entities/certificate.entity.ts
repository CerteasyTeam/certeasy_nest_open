import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToOne,
  JoinColumn,
  ManyToMany,
  OneToMany,
  VirtualColumn,
} from 'typeorm';
import { Expose } from 'class-transformer';
import { cryptoMd5, randomString } from '@app/utils';
import { BaseEntity } from '@app/common';
// entities
import { CertificateVersionEntity } from '.';
import { DnsEntity } from '@app/modules/dns/entities';
import { CloudEntity } from '@app/modules/cloud/entities';

@Entity('certificate')
export class CertificateEntity extends BaseEntity {
  @PrimaryGeneratedColumn({ type: 'int', name: 'id' })
  id: number;

  @Column({ type: 'int', name: 'user_id', comment: '所属用户' })
  userId: number;

  @Column({ type: 'int', name: 'dns_server_id', comment: 'dns服务器' })
  dnsServerId: number;

  @ManyToOne(() => DnsEntity, (dns) => dns.certificates)
  @JoinColumn({ name: 'dns_server_id' })
  dnsServer: DnsEntity;

  @Expose()
  @Column({ type: 'varchar', name: 'cert_agency', comment: '证书机构' })
  certAgency: string;

  @Expose()
  @Column({ type: 'varchar', name: 'name', comment: '证书名称' })
  name: string;

  @Expose()
  @Column({
    type: 'json',
    name: 'domains',
    comment: '证书域名',
  })
  domains: any;

  @Expose()
  @Column({ type: 'varchar', name: 'alias', comment: '别名' })
  alias: string;

  @Column({ type: 'tinyint', name: 'type', comment: '申请类型' })
  type: number;

  @Column({ type: 'tinyint', name: 'auth_mode', comment: '认证模式' })
  authMode: number;

  @Expose()
  @Column({ type: 'tinyint', name: 'auto_notify', comment: '自动通知' })
  autoNotify: number;

  @Expose()
  @Column({
    type: 'int',
    name: 'notify_days_in_advance',
    comment: '提前天数',
  })
  notifyDaysInAdvance: number;

  @Expose()
  @Column({ type: 'tinyint', name: 'auto_update', comment: '自动更新' })
  autoUpdate: number;

  @Expose()
  @Column({ type: 'int', name: 'update_days_in_advance', comment: '提前天数' })
  updateDaysInAdvance: number;

  @Expose()
  @Column({ type: 'tinyint', name: 'auto_push', comment: '自动推送' })
  autoPush: number;

  @Expose()
  @Column({ type: 'int', name: 'latest_version_id', comment: '最新版本' })
  latestVersionId: number;

  @OneToOne(() => CertificateVersionEntity)
  @JoinColumn({ name: 'latest_version_id' })
  latestVersion: CertificateVersionEntity;

  @VirtualColumn('varchar', {
    query: (alias) => alias,
  })
  expiredTime: string;

  @VirtualColumn('varchar', {
    query: (alias) => alias,
  })
  revokedTime: string;

  @VirtualColumn('varchar', {
    query: (alias) => alias,
  })
  latestVersionStatus: string;

  @VirtualColumn('varchar', {
    query: (alias) => alias,
  })
  latestVersionTime: string;

  @Expose()
  @Column({
    type: 'int',
    name: 'latest_valid_version_id',
    comment: '最新激活版本',
  })
  latestValidVersionId: number;

  @OneToOne(() => CertificateVersionEntity)
  @JoinColumn({ name: 'latest_valid_version_id' })
  latestValidVersion: CertificateVersionEntity;

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
    this.name = `cert-${randomString(16, cryptoMd5(JSON.stringify(this.domains)))}`;
  }

  @ManyToMany(() => CloudEntity, (cloud) => cloud.certificates)
  clouds: CloudEntity[];

  @OneToMany(() => CertificateVersionEntity, (version) => version.certificate)
  @JoinColumn({ name: 'id' })
  certificateVersions: CertificateVersionEntity[];
}
