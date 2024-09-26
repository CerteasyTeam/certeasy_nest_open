import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Expose } from 'class-transformer';
import { BaseEntity } from '@app/common';

@Entity('dns_provider')
export class DnsProviderEntity extends BaseEntity {
  @PrimaryGeneratedColumn({ type: 'int', name: 'id' })
  id: number;

  @Expose()
  @Column({ type: 'varchar', name: 'name', comment: '名称' })
  name: string;

  @Expose()
  @Column({ type: 'varchar', name: 'logo', comment: 'logo' })
  logo: string;

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
