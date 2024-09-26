import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { BaseEntity } from '@app/common';
import { NotificationEntity, NotificationChannelEntity } from '.';

@Entity('notification_config')
export class NotificationConfigEntity extends BaseEntity {
  @PrimaryGeneratedColumn({ type: 'int', name: 'id' })
  id: number;

  @Column({ type: 'int', name: 'user_id', comment: '用户' })
  userId: number;

  @Column({ type: 'int', name: 'notification_id', comment: '通知' })
  notificationId: number;

  @Column({ type: 'json', name: 'channel_ids', comment: '渠道数据' })
  channelIds: any;

  @Column({ type: 'tinyint', name: 'status' })
  status: number;

  @CreateDateColumn({ type: 'datetime', name: 'create_time' })
  createTime: Date | string;

  @UpdateDateColumn({ type: 'datetime', name: 'update_time' })
  updateTime: Date | string;

  @ManyToOne(() => NotificationEntity, (notification) => notification.id)
  @JoinColumn({ name: 'notification_id' })
  notification: NotificationEntity;
}
