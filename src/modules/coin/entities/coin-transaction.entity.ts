import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { BaseEntity, DATE_FORMAT } from '@app/common';
import * as dayjs from 'dayjs';

@Entity('coin_transaction')
export class CoinTransactionEntity extends BaseEntity {
  @PrimaryGeneratedColumn({ type: 'int', name: 'id' })
  id: number;

  @Column({ type: 'int', name: 'user_id', comment: '用户id' })
  userId: number;

  @Column({ type: 'int', name: 'coin_id', comment: '产品id' })
  coinId: number;

  @Column({ type: 'varchar', name: 'out_trade_no', comment: '交易单号' })
  outTradeNo: string;

  @Column({ type: 'varchar', name: 'subject', comment: '交易主题' })
  subject: string;

  @Column({ type: 'varchar', name: 'body', comment: '交易内容' })
  body: string;

  @Column({
    type: 'decimal',
    name: 'price',
    comment: '单价',
    transformer: {
      to: (value: number) => value,
      from: (value: string) => parseFloat(value),
    },
  })
  price: number;

  @Column({
    type: 'decimal',
    name: 'amount',
    comment: '金额',
    transformer: {
      to: (value: number) => value,
      from: (value: string) => parseFloat(value),
    },
  })
  amount: number;

  @Column({
    type: 'decimal',
    name: 'coin',
    comment: '金币',
    transformer: {
      to: (value: number) => value,
      from: (value: string) => parseFloat(value),
    },
  })
  coin: number;

  @Column({
    type: 'datetime',
    name: 'paid_time',
    comment: '支付时间',
    transformer: {
      to: (value: any) => value,
      from: (value: any) => dayjs(value).format(DATE_FORMAT),
    },
  })
  paidTime: Date | string;

  @Column({ type: 'tinyint', name: 'status' })
  status: number;

  @CreateDateColumn({ type: 'datetime', name: 'create_time' })
  createTime: Date | string;

  @UpdateDateColumn({ type: 'datetime', name: 'update_time' })
  updateTime: Date | string;
}
