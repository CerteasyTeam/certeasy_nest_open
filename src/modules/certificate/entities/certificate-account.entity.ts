import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { BaseEntity } from '@app/common';

@Entity('certificate_account')
export class CertificateAccountEntity extends BaseEntity {
  @PrimaryGeneratedColumn({ type: 'int', name: 'id' })
  id: number;

  @Column({ type: 'int', name: 'certificate_id', comment: '所属证书' })
  certificateId: number;

  @Column({ type: 'varchar', name: 'contact', comment: '错误信息' })
  contact: string;

  @Column({ type: 'varchar', name: 'key', comment: '密钥' })
  key: string;

  @Column({ type: 'varchar', name: 'url', comment: 'url' })
  url: string;

  @Column({ type: 'varchar', name: 'directory', comment: 'directory' })
  directory: string;

  @Column({ type: 'tinyint', name: 'status' })
  status: number;

  @CreateDateColumn({ type: 'datetime', name: 'create_time' })
  createTime: Date | string;

  @UpdateDateColumn({ type: 'datetime', name: 'update_time' })
  updateTime: Date | string;
}
