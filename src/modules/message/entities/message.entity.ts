import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { BaseEntity } from '@app/common';

@Entity('message')
export class MessageEntity extends BaseEntity {
  @PrimaryGeneratedColumn({ type: 'int', name: 'id' })
  id: number;

  @Column({ type: 'int', name: 'user_id', comment: '接收用户' })
  userId: number;

  @Column({ type: 'varchar', name: 'title', comment: '标题' })
  title: string;

  @Column({ type: 'text', name: 'content', comment: '内容' })
  content: string;

  @Column({ type: 'tinyint', name: 'status' })
  status: number;

  @CreateDateColumn({ type: 'datetime', name: 'create_time' })
  createTime: Date | string;

  @UpdateDateColumn({ type: 'datetime', name: 'update_time' })
  updateTime: Date | string;
}
