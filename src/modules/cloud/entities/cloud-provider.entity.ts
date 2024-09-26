import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Expose } from 'class-transformer';
import { BaseEntity } from '@app/common';
import { CloudProviderProductEntity } from '.';

@Entity('cloud_provider')
export class CloudProviderEntity extends BaseEntity {
  @PrimaryGeneratedColumn({ type: 'int', name: 'id' })
  id: number;

  @Expose()
  @Column({ type: 'varchar', name: 'name', comment: '名称' })
  name: string;

  @Expose()
  @Column({ type: 'varchar', name: 'alias', comment: '别称' })
  alias: string;

  @Expose()
  @Column({ type: 'varchar', name: 'logo', comment: 'logo' })
  logo: string;

  @Expose()
  @Column({ type: 'tinyint', name: 'status' })
  status: number;

  @CreateDateColumn({ type: 'datetime', name: 'create_time' })
  createTime: Date | string;

  @UpdateDateColumn({ type: 'datetime', name: 'update_time' })
  updateTime: Date | string;

  @OneToMany(() => CloudProviderProductEntity, (product) => product.provider)
  @JoinColumn({ name: 'id' })
  providerProducts: CloudProviderProductEntity[];
}
