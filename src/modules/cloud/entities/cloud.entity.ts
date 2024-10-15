import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  OneToOne,
  ManyToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  JoinColumn,
  VirtualColumn,
  JoinTable,
} from 'typeorm';
import {
  cryptoDecrypt,
  cryptoEncrypt,
  cryptoMd5,
  randomString,
} from '@app/utils';
import { Expose } from 'class-transformer';
import { BaseEntity } from '@app/common';
// entities
import {
  CloudProviderEntity,
  CloudCertificateEntity,
  CloudProviderProductEntity,
} from './';
import { CertificateEntity } from '@app/modules/certificate/entities';

@Entity('cloud')
export class CloudEntity extends BaseEntity {
  @PrimaryGeneratedColumn({ type: 'int', name: 'id' })
  id: number;

  @Expose()
  @Column({ type: 'int', name: 'user_id', comment: '所属用户' })
  userId: number;

  @Expose()
  @Column({ type: 'int', name: 'provider_id', comment: '提供商ID' })
  providerId: number;

  @OneToOne(() => CloudProviderEntity, (provider) => provider.id)
  @JoinColumn({ name: 'provider_id' })
  provider: CloudProviderEntity;

  @VirtualColumn({ query: (alias) => alias })
  providerName: string;

  @VirtualColumn({ query: (alias) => alias })
  providerLogo: string;

  @Expose()
  @Column({ type: 'int', name: 'provider_product_id', comment: '提供商产品ID' })
  providerProductId: number;

  @OneToOne(() => CloudProviderProductEntity, (product) => product.id)
  @JoinColumn({ name: 'provider_product_id' })
  providerProduct: CloudProviderProductEntity;

  @VirtualColumn({ query: (alias) => alias })
  providerProductName: string;

  @VirtualColumn({ query: (alias) => alias })
  providerProductAliasName: string;

  @VirtualColumn('json', { query: (alias) => alias })
  providerProductConfigJson: any;

  @Expose()
  @Column({ type: 'varchar', name: 'name', comment: '名称' })
  name: string;

  @Expose()
  @Column({ type: 'varchar', name: 'alias', comment: '别名' })
  alias: string;

  @Expose()
  @Column({
    type: 'text',
    name: 'accessJson',
    nullable: true,
    comment: '配置信息',
    transformer: {
      to: (value: any) =>
        value ? cryptoEncrypt(JSON.stringify(value)) : value, // 保存时加密
      from: (value: any) => (value ? JSON.parse(cryptoDecrypt(value)) : value), // 读取时解密
    },
  })
  accessJson: any;

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
    this.name = `cloud-${randomString(16, cryptoMd5(JSON.stringify(this.accessJson)))}`;
  }

  @OneToOne(() => CloudCertificateEntity, (certificate) => certificate.cloud)
  certificate: CloudCertificateEntity;

  @ManyToMany(() => CertificateEntity, (certificate) => certificate.clouds)
  @JoinTable({
    name: 'cloud_certificate',
    joinColumn: { name: 'cloud_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'certificate_id', referencedColumnName: 'id' },
  })
  certificates: CertificateEntity[];

  @VirtualColumn('number', {
    query: (alias) => alias,
  })
  certificatesCount: number;
}
