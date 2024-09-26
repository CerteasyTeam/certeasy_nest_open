import { Global, Module } from '@nestjs/common';
import { ValidationService } from './validation.service';
import { MailerModule } from '@nestjs-modules/mailer';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as path from 'path';
import { EjsAdapter } from '@nestjs-modules/mailer/dist/adapters/ejs.adapter';

@Global()
@Module({
  imports: [
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        transport: {
          host: configService.get<string>('email.host'), //邮箱服务器地址
          port: 465, //服务器端口 默认 465
          auth: {
            user: configService.get<string>('email.account'), //你的邮箱地址
            pass: configService.get<string>('email.passwd'),
          },
        },
        preview: configService.get<string>('env') === 'development', //是否开启预览，开启了这个属性，在调试模式下会自动打开一个网页，预览邮件
        defaults: {
          from: `CERTEASY <${configService.get<string>('email.account')}>`, //发送人 你的邮箱地址
        },
        template: {
          dir: path.join(process.cwd(), './template'), //这里就是你的ejs模板文件夹路径
          adapter: new EjsAdapter(),
          options: {
            strict: true, //严格模式
          },
        },
      }),
    }),
  ],
  providers: [ValidationService],
  exports: [ValidationService],
})
export class ValidationModule {}
