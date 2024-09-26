import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { BaseEntity } from '@app/common';

@Entity('user_coin_transaction')
export class UserCoinTransactionEntity extends BaseEntity {
  @PrimaryGeneratedColumn({ type: 'int', name: 'id' })
  id: number;

  @Column({ type: 'int', name: 'user_id', comment: '所属用户' })
  userId: number;

  @Column({ type: 'tinyint', name: 'type', comment: '类型' })
  type: number;

  @Column({ type: 'decimal', name: 'coin', comment: '金币' })
  coin: number;

  @Column({ type: 'decimal', name: 'coin_after', comment: '交易之后' })
  coinAfter: number;

  @Column({ type: 'varchar', name: 'remark', comment: '备注' })
  remark: string;

  @Column({ type: 'tinyint', name: 'status' })
  status: number;

  @CreateDateColumn({ type: 'datetime', name: 'create_time' })
  createTime: Date | string;

  @UpdateDateColumn({ type: 'datetime', name: 'update_time' })
  updateTime: Date | string;
}
