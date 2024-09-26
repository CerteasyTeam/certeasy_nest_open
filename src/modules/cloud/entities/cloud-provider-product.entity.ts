import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Expose } from 'class-transformer';
import { BaseEntity } from '@app/common';
import { CloudProviderEntity } from '.';

@Entity('cloud_provider_product')
export class CloudProviderProductEntity extends BaseEntity {
  @PrimaryGeneratedColumn({ type: 'int', name: 'id' })
  id: number;

  @Expose()
  @Column({ type: 'int', name: 'provider_id', comment: '供应商id' })
  providerId: number;

  @ManyToOne(() => CloudProviderEntity, (provider) => provider.id)
  @JoinColumn({ name: 'provider_id' })
  provider: CloudProviderEntity;

  @Expose()
  @Column({ type: 'varchar', name: 'name', comment: '名称' })
  name: string;

  @Expose()
  @Column({ type: 'varchar', name: 'alias', comment: 'alias' })
  alias: string;

  @Expose()
  @Column({ type: 'json', name: 'configJson', comment: '配置' })
  configJson: any;

  @Expose()
  @Column({ type: 'tinyint', name: 'status' })
  status: number;

  @CreateDateColumn({ type: 'datetime', name: 'create_time' })
  createTime: Date | string;

  @UpdateDateColumn({ type: 'datetime', name: 'update_time' })
  updateTime: Date | string;
}
