import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { CoinController } from './coin.controller';
import { CoinService } from './coin.service';
// modules
import { NotificationModule, UserModule } from '@app/modules';
import { AlipayModule } from '@app/share';
// entities
import { CoinEntity, CoinTransactionEntity } from './entities';
// processors
import { CoinProcessor } from './processors';

@Module({
  imports: [
    forwardRef(() => UserModule),
    forwardRef(() => NotificationModule),
    AlipayModule,
    TypeOrmModule.forFeature([CoinEntity, CoinTransactionEntity]),
    BullModule.registerQueue({
      name: 'coin',
    }),
  ],
  controllers: [CoinController],
  providers: [CoinService, CoinProcessor],
})
export class CoinModule {}
