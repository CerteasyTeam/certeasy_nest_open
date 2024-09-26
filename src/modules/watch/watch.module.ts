import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { HttpModule } from '@nestjs/axios';
import { WatchController } from './watch.controller';
import { WatchService } from './watch.service';
// entities
import {
  WatchCertificateEntity,
  WatchEntity,
  WatchRecordEntity,
} from './entities';
// processors
import { WatchProcessor } from './processors';
import { NotificationModule } from '@app/modules';
// jobs
import { MissedWatchesJobService } from './jobs';

@Module({
  imports: [
    HttpModule,
    forwardRef(() => NotificationModule),
    TypeOrmModule.forFeature([
      WatchEntity,
      WatchRecordEntity,
      WatchCertificateEntity,
    ]),
    BullModule.registerQueue({
      name: 'watch',
    }),
  ],
  controllers: [WatchController],
  providers: [WatchService, WatchProcessor, MissedWatchesJobService],
  exports: [WatchService],
})
export class WatchModule {}
