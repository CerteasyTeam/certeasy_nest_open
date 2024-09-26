import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { BaseEntity } from '@app/common';
import { Expose } from 'class-transformer';
import { NotificationChannelEntity } from '@app/modules/notification/entities/notification-channel.entity';

@Entity('notification_provider')
export class NotificationProviderEntity extends BaseEntity {
  @PrimaryGeneratedColumn({ type: 'int', name: 'id' })
  id: number;

  @Column({ type: 'varchar', name: 'name', comment: '名称' })
  name: string;

  @Column({ type: 'varchar', name: 'logo', comment: 'logo' })
  logo: string;

  @Expose()
  @Column({ type: 'json', name: 'configJson', comment: '配置' })
  configJson: any;

  @Column({ type: 'tinyint', name: 'status' })
  status: number;

  @CreateDateColumn({ type: 'datetime', name: 'create_time' })
  createTime: Date | string;

  @UpdateDateColumn({ type: 'datetime', name: 'update_time' })
  updateTime: Date | string;

  @OneToMany(() => NotificationChannelEntity, (channel) => channel.provider)
  channels: NotificationChannelEntity[];
}
