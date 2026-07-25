import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as express from 'express';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { Config } from './config';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.use(helmet());
  if (Config.TRUST_PROXY) {
    app.set('trust proxy', 1);
  }

  app.enableCors({
    origin: Config.CORS_ORIGIN === '*' ? true : Config.CORS_ORIGIN.split(',').map((s) => s.trim()),
    credentials: Config.CORS_ORIGIN !== '*',
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      disableErrorMessages: Config.NODE_ENV === 'production',
    }),
  );

  app.use('/screenshots', express.static(Config.SCREENSHOT_DIR));
  app.use('/reports-output', express.static(Config.REPORT_DIR));

  if (Config.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Attack Surface Discovery API')
      .setDescription('Prototype API for attack surface discovery')
      .setVersion('0.0.1')
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  await app.listen(Config.PORT);
  console.log(`Backend listening on http://localhost:${Config.PORT}`);
}

bootstrap();
