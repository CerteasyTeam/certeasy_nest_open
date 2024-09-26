import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { HttpModule } from '@nestjs/axios';
import { CloudController } from './cloud.controller';
import { CloudService } from './cloud.service';
// entities
import {
  CloudEntity,
  CloudProviderEntity,
  CloudCertificateEntity,
  CloudProviderProductEntity,
  CloudDeployEntity,
} from './entities';
// processors
import { CloudProcessor } from './processors';
import { NotificationModule } from '@app/modules';

@Module({
  imports: [
    HttpModule,
    forwardRef(() => NotificationModule),
    TypeOrmModule.forFeature([
      CloudEntity,
      CloudProviderEntity,
      CloudProviderProductEntity,
      CloudCertificateEntity,
      CloudDeployEntity,
    ]),
    BullModule.registerQueue({
      name: 'cloud',
    }),
  ],
  controllers: [CloudController],
  providers: [CloudService, CloudProcessor],
  exports: [CloudService],
})
export class CloudModule {}
