import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  VirtualColumn,
} from 'typeorm';
import { Expose } from 'class-transformer';
import { BaseEntity } from '@app/common';
// entities
import { CertificateEntity } from '@app/modules/certificate/entities';
import { CloudDeployEntity, CloudEntity } from './';
@Entity('cloud_certificate')
export class CloudCertificateEntity extends BaseEntity {
  @PrimaryGeneratedColumn({ type: 'int', name: 'id' })
  id: number;

  @Expose()
  @Column({ type: 'int', name: 'cloud_id', comment: '提供商ID' })
  cloudId: number;

  @OneToOne(() => CloudEntity, (cloud) => cloud.id)
  @JoinColumn({ name: 'cloud_id' })
  cloud: CloudEntity;

  @Expose()
  @Column({ type: 'int', name: 'certificate_id', comment: '提供商ID' })
  certificateId: number;

  @OneToOne(() => CertificateEntity, (certificate) => certificate.id)
  @JoinColumn({ name: 'certificate_id' })
  certificate: CertificateEntity;

  @CreateDateColumn({ type: 'datetime', name: 'create_time' })
  createTime: Date | string;

  @UpdateDateColumn({ type: 'datetime', name: 'update_time' })
  updateTime: Date | string;

  @OneToOne(
    () => CloudDeployEntity,
    (cloudDeploy) => cloudDeploy.cloudCertificateId,
  )
  @JoinColumn({ name: 'id' })
  deployment: CloudDeployEntity;

  @OneToMany(
    () => CloudDeployEntity,
    (cloudDeploy) => cloudDeploy.cloudCertificate,
  )
  deployments: CloudDeployEntity[];

  @VirtualColumn({ query: (alias) => alias })
  name: string;

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
}
