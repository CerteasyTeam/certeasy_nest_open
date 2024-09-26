import { Module, forwardRef } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { CommonController } from './common.controller';
import { CommonService } from './common.service';
// modules
import {
  CertificateModule,
  DnsModule,
  CloudModule,
  WatchModule,
  UserModule,
} from '@app/modules';

@Module({
  imports: [
    forwardRef(() => CertificateModule),
    forwardRef(() => DnsModule),
    forwardRef(() => CloudModule),
    forwardRef(() => WatchModule),
    forwardRef(() => UserModule),
    HttpModule,
  ],
  controllers: [CommonController],
  providers: [CommonService],
})
export class CommonModule {}
