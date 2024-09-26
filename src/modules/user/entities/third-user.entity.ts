import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { BaseEntity } from '@app/common';

@Entity('third_user')
export class ThirdUserEntity extends BaseEntity {
  @PrimaryGeneratedColumn({ type: 'int', name: 'id' })
  id: number;

  @Column({ type: 'int', name: 'user_id', comment: '关联用户ID' })
  userId: number;

  @Column({ type: 'varchar', name: 'third_user_id', comment: '第三方用户id' })
  thirdUserId: any;

  @Column({
    type: 'varchar',
    name: 'third_type',
    comment: 'QQ GITHUB WECHAT GOOGLE',
  })
  thirdType: string;

  @Column({ type: 'varchar', name: 'access_token', comment: '授权token' })
  accessToken: string;

  @Column({ type: 'varchar', name: 'refresh_token', comment: '刷新token' })
  refreshToken: string;

  @Column({ type: 'datetime', name: 'expired_time', comment: '过期时间' })
  expiredTime: Date | string;

  @Column({ type: 'tinyint', name: 'status' })
  status: number;

  @CreateDateColumn({ type: 'datetime', name: 'create_time' })
  createTime: Date | string;

  @UpdateDateColumn({ type: 'datetime', name: 'update_time' })
  updateTime: Date | string;
}
