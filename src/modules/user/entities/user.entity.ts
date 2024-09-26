import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { bcryptHash, cryptoMd5, randomString } from '@app/utils';
import { BaseEntity } from '@app/common';

@Entity('user')
export class UserEntity extends BaseEntity {
  @PrimaryGeneratedColumn({ type: 'int', name: 'id' })
  id: number;

  @Unique('unique_user_code', ['user_code'])
  @Column({ type: 'varchar', name: 'user_code', comment: '编码' })
  userCode: string;

  @Column({ type: 'varchar', name: 'nick_name', comment: '昵称' })
  nickName: string;

  @Unique('unique_email', ['email'])
  @Column({ type: 'varchar', name: 'email', comment: '邮箱' })
  email: string;

  @Column({ type: 'varchar', name: 'passwd', comment: '密码' })
  passwd: string;

  @Column({ type: 'tinyint', name: 'status' })
  status: number;

  @CreateDateColumn({ type: 'datetime', name: 'create_time' })
  createTime: Date | string;

  @UpdateDateColumn({ type: 'datetime', name: 'update_time' })
  updateTime: Date | string;

  // save才有效
  @BeforeInsert()
  encryptPwd() {
    this.passwd = bcryptHash(this.passwd);
  }

  @BeforeInsert()
  updateUserCode(): void {
    this.userCode = randomString(16, cryptoMd5(this.email));
  }
}
