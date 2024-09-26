import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  VirtualColumn,
} from 'typeorm';
import { BaseEntity } from '@app/common';
import { NotificationProviderEntity } from '.';
import { Expose } from 'class-transformer';
import { cryptoMd5, randomString } from '@app/utils';

@Entity('notification_channel')
export class NotificationChannelEntity extends BaseEntity {
  @PrimaryGeneratedColumn({ type: 'int', name: 'id' })
  id: number;

  @Column({ type: 'int', name: 'user_id', comment: '用户' })
  userId: number;

  @Column({ type: 'int', name: 'provider_id', comment: 'provider' })
  providerId: number;

  @VirtualColumn('varchar', {
    query: (alias) => alias,
  })
  providerLogo: string;

  @VirtualColumn('varchar', {
    query: (alias) => alias,
  })
  providerName: string;

  @Expose()
  @Column({ type: 'varchar', name: 'name', comment: '名称' })
  name: string;

  @Expose()
  @Expose()
  @Column({ type: 'varchar', name: 'alias', comment: '别称' })
  alias: string;

  @Expose()
  @Column({ type: 'json', name: 'accessJson', comment: '配置内容' })
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
    this.name = `notification-${randomString(16, cryptoMd5(JSON.stringify(this.accessJson)))}`;
  }

  @ManyToOne(() => NotificationProviderEntity, (provider) => provider.channels)
  @JoinColumn({ name: 'provider_id' })
  provider: NotificationProviderEntity;
}
