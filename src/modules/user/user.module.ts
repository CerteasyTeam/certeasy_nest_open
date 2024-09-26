import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
// entities
import {
  UserCoinEntity,
  UserEntity,
  UserCoinTransactionEntity,
  UserInvitationEntity,
  ThirdUserEntity,
} from './entities';
// modules
import { NotificationModule } from '@app/modules/notification/notification.module';

@Module({
  imports: [
    NotificationModule,
    TypeOrmModule.forFeature([
      UserEntity,
      UserCoinEntity,
      UserCoinTransactionEntity,
      UserInvitationEntity,
      ThirdUserEntity,
    ]),
  ],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
