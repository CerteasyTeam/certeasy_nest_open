import { forwardRef, Global, Module } from '@nestjs/common';
import { BillingService } from './billing.service';
import { NotificationModule, UserModule } from '@app/modules';

@Global()
@Module({
  imports: [forwardRef(() => UserModule), forwardRef(() => NotificationModule)],
  providers: [BillingService],
  exports: [BillingService],
})
export class BillingModule {}
