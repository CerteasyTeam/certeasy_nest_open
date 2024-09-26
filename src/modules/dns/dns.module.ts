import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { HttpModule } from '@nestjs/axios';
import { DnsController } from './dns.controller';
import { DnsService } from './dns.service';
// entities
import { DnsEntity, DnsProviderEntity } from './entities';
// processors

@Module({
  imports: [
    HttpModule,
    TypeOrmModule.forFeature([DnsEntity, DnsProviderEntity]),
    BullModule.registerQueue({
      name: 'dns',
    }),
  ],
  controllers: [DnsController],
  providers: [DnsService],
  exports: [DnsService],
})
export class DnsModule {}
