import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserEntity } from '.';
import { BaseEntity } from '@app/common';

@Entity('user_invitation')
export class UserInvitationEntity extends BaseEntity {
  @PrimaryGeneratedColumn({ type: 'int', name: 'id' })
  id: number;

  @Column({ type: 'int', name: 'user_id', comment: '所属用户' })
  userId: number;

  @OneToOne(() => UserEntity, (user) => user.id)
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @Column({ type: 'int', name: 'signup_id', comment: '注册用户' })
  signupId: number;

  @OneToOne(() => UserEntity, (user) => user.id)
  @JoinColumn({ name: 'signup_id' })
  signup: UserEntity;

  @Column({ type: 'decimal', name: 'coin', comment: '金币奖励' })
  coin: number;

  @CreateDateColumn({ type: 'datetime', name: 'create_time' })
  createTime: Date | string;

  @UpdateDateColumn({ type: 'datetime', name: 'update_time' })
  updateTime: Date | string;
}
