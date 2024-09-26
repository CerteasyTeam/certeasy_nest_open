import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { HttpModule } from '@nestjs/axios';
// controller
import { CertificateController } from './certificate.controller';
// entities
import {
  CertificateEntity,
  CertificateVersionEntity,
  CertificateAccountEntity,
  CertificateDetailEntity,
} from './entities';
import { CertificateService } from './certificate.service';
// processors
import { CertificateProcessor } from './processors';
import { UserModule, DnsModule, NotificationModule } from '@app/modules';
import { CloudModule } from '@app/modules';
// jobs
import { ExpirationJobService } from '@app/modules/certificate/jobs';

@Module({
  imports: [
    HttpModule,
    forwardRef(() => UserModule),
    forwardRef(() => DnsModule),
    forwardRef(() => CloudModule),
    forwardRef(() => NotificationModule),
    TypeOrmModule.forFeature([
      CertificateEntity,
      CertificateVersionEntity,
      CertificateAccountEntity,
      CertificateDetailEntity,
    ]),
    BullModule.registerQueue({
      name: 'certificate',
    }),
  ],
  controllers: [CertificateController],
  providers: [CertificateService, CertificateProcessor, ExpirationJobService],
  exports: [CertificateService],
})
export class CertificateModule {}
