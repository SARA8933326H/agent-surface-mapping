import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as express from 'express';
import { AppModule } from './app.module';
import { Config } from './config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin: Config.CORS_ORIGIN, credentials: true });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.use('/screenshots', express.static(Config.SCREENSHOT_DIR));
  app.use('/reports-output', express.static(Config.REPORT_DIR));

  const config = new DocumentBuilder()
    .setTitle('Attack Surface Discovery API')
    .setDescription('Prototype API for attack surface discovery')
    .setVersion('0.0.1')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(Config.PORT);
  console.log(`Backend listening on http://localhost:${Config.PORT}`);
}

bootstrap();
