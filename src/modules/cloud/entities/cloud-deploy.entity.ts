import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  VirtualColumn,
} from 'typeorm';
import { Expose } from 'class-transformer';
import { BaseEntity } from '@app/common';
// entities
import { CertificateEntity } from '@app/modules/certificate/entities';
import {
  CloudEntity,
  CloudCertificateEntity,
  CloudProviderProductEntity,
} from './';
@Entity('cloud_deploy')
export class CloudDeployEntity extends BaseEntity {
  @PrimaryGeneratedColumn({ type: 'int', name: 'id' })
  id: number;

  @Expose()
  @Column({
    type: 'int',
    name: 'cloud_certificate_id',
    comment: '云资源证书id',
  })
  cloudCertificateId: number;

  @ManyToOne(() => CloudCertificateEntity, (certificate) => certificate.id)
  @JoinColumn({ name: 'cloud_certificate_id' })
  cloudCertificate: CloudCertificateEntity;

  @Expose()
  @Column({ type: 'varchar', name: 'error', comment: '错误信息' })
  error: string;

  @Expose()
  @Column({ type: 'tinyint', name: 'status' })
  status: number;

  @CreateDateColumn({ type: 'datetime', name: 'create_time' })
  createTime: Date | string;

  @UpdateDateColumn({ type: 'datetime', name: 'update_time' })
  updateTime: Date | string;

  @VirtualColumn({ query: (alias) => alias })
  name: string;

  @VirtualColumn({ query: (alias) => alias })
  cloudId: string;

  @VirtualColumn({ query: (alias) => alias })
  cloudName: string;

  @VirtualColumn({ query: (alias) => alias })
  providerId: string;

  @VirtualColumn({ query: (alias) => alias })
  providerName: string;

  @VirtualColumn({ query: (alias) => alias })
  providerLogo: string;

  @VirtualColumn({ query: (alias) => alias })
  providerProductId: number;

  @VirtualColumn({ query: (alias) => alias })
  providerProductName: number;

  @VirtualColumn({ query: (alias) => alias })
  certificateId: string;

  @VirtualColumn({ query: (alias) => alias })
  certificateName: string;

  @VirtualColumn({ query: (alias) => alias })
  certificateAlias: string;

  @VirtualColumn({ query: (alias) => alias })
  certificateType: string;

  @VirtualColumn('json', { query: (alias) => alias })
  certificateDomains: any;

  @VirtualColumn({ query: (alias) => alias })
  certificateVersionId: string;
}
