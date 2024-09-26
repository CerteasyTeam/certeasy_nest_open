import { Global, Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { AcmeClientLogger } from './loggers';
import { AcmeService } from './acme.service';

@Global()
@Module({
  imports: [HttpModule],
  providers: [AcmeService, AcmeClientLogger],
  exports: [AcmeService, AcmeClientLogger],
})
export class AcmeModule {}
