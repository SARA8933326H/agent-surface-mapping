import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { CrawlWorker } from './queue/crawl-worker';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const worker = app.get(CrawlWorker);
  await worker.start();
  console.log('Crawl worker started');
}

bootstrap();
