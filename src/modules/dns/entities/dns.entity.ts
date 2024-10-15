import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  OneToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  JoinColumn,
  VirtualColumn,
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
import { CertificateEntity } from '@app/modules/certificate/entities';
import { DnsProviderEntity } from './';

@Entity('dns')
export class DnsEntity extends BaseEntity {
  @PrimaryGeneratedColumn({ type: 'int', name: 'id' })
  id: number;

  @Expose()
  @Column({ type: 'int', name: 'user_id', comment: '所属用户' })
  userId: number;

  @Expose()
  @Column({ type: 'int', name: 'provider_id', comment: '提供商ID' })
  providerId: number;

  @OneToOne(() => DnsProviderEntity, (provider) => provider.id)
  @JoinColumn({ name: 'provider_id' })
  provider: DnsProviderEntity;

  @VirtualColumn({ query: (alias) => alias })
  providerName: string;

  @VirtualColumn({ query: (alias) => alias })
  providerLogo: string;

  @VirtualColumn('json', { query: (alias) => alias })
  providerConfigJson: string;

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
    this.name = `dns-${randomString(16, cryptoMd5(JSON.stringify(this.accessJson)))}`;
  }

  @OneToMany(() => CertificateEntity, (certificate) => certificate.dnsServer)
  @JoinColumn({ name: 'id' })
  certificates: CertificateEntity[];

  @VirtualColumn('number', {
    query: (alias) => alias,
  })
  certificatesCount: number;
}
