import {
  Column,
  CreateDateColumn,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Expose } from 'class-transformer';
import * as dayjs from 'dayjs';
// @app/common
import { DATE_FORMAT } from '@app/common';

/**
 * 公共实体
 */
export class BaseEntity {
  @PrimaryGeneratedColumn({ type: 'int', name: 'id' })
  id: number;

  @Expose()
  @Column({ type: 'tinyint', name: 'status' })
  status: number;

  @CreateDateColumn({
    type: 'datetime',
    name: 'create_time',
    transformer: {
      to: (value: any) => value,
      from: (value: any) => dayjs(value).format(DATE_FORMAT),
    },
  })
  createTime: Date | string;

  @UpdateDateColumn({
    type: 'datetime',
    name: 'update_time',
    transformer: {
      to: (value: any) => value,
      from: (value: any) => dayjs(value).format(DATE_FORMAT),
    },
  })
  updateTime: Date | string;
}
