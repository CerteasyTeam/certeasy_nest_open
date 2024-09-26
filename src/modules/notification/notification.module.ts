import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { HttpModule } from '@nestjs/axios';

// entities
import {
  NotificationEntity,
  NotificationChannelEntity,
  NotificationConfigEntity,
  NotificationProviderEntity,
} from './entities';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
// processors
import { NotificationProcessor } from './processors';
// channels
import {
  EmailChannelService,
  DingTalkChannelService,
  QYApiChannelService,
} from './channels';

@Module({
  imports: [
    HttpModule,
    TypeOrmModule.forFeature([
      NotificationEntity,
      NotificationChannelEntity,
      NotificationConfigEntity,
      NotificationProviderEntity,
    ]),
    BullModule.registerQueue({
      name: 'notification',
    }),
  ],
  controllers: [NotificationController],
  providers: [
    NotificationService,
    NotificationProcessor,
    // channels
    EmailChannelService,
    DingTalkChannelService,
    QYApiChannelService,
  ],
  exports: [NotificationService],
})
export class NotificationModule {}
