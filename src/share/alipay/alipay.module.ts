import { Global, Module } from '@nestjs/common';
import { AlipayService } from './alipay.service';

@Global()
@Module({
  providers: [AlipayService],
  exports: [AlipayService],
})
export class AlipayModule {}
