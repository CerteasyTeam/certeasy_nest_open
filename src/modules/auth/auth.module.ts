import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
// modules
import { UserModule } from '@app/modules/user/user.module';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [HttpModule, UserModule],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
