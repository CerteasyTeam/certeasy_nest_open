import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Expose } from 'class-transformer';
// entities

@Entity('coin')
export class CoinEntity {
  @PrimaryGeneratedColumn({ type: 'int', name: 'id' })
  id: number;

  @Expose()
  @Column({ type: 'varchar', name: 'name', comment: '产品名称' })
  name: string;

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
    type: 'decimal',
    name: 'gift_coin',
    comment: '赠送金币',
    transformer: {
      to: (value: number) => value,
      from: (value: string) => parseFloat(value),
    },
  })
  giftCoin: number;

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

  @Expose()
  @Column({ type: 'tinyint', name: 'status' })
  status: number;

  @CreateDateColumn({ type: 'datetime', name: 'create_time' })
  createTime: Date | string;

  @UpdateDateColumn({ type: 'datetime', name: 'update_time' })
  updateTime: Date | string;
}
