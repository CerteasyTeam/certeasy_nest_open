import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { json, urlencoded } from 'express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // config
  const configService = app.get(ConfigService);
  app.use(json({ limit: '10mb' }));
  app.use(urlencoded({ extended: true, limit: '10mb' }));
  // Swagger configuration
  const options = new DocumentBuilder()
    .setTitle('Cert Easy API')
    .setDescription('API description')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, options);
  SwaggerModule.setup('swagger-ui', app, document);
  // 端口和地址
  await app.listen(
    configService.get<number>('app.port', 9370),
    configService.get<string>('app.host', '0.0.0.0'),
    async () => {
      Logger.log('Starting on env: ' + configService.get<string>('app.env'));
      Logger.log(`listening on ${await app.getUrl()}`);
      Logger.log(`swagger running on ${await app.getUrl()}/swagger-ui`);
    },
  );
}
bootstrap();
