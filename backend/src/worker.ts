import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { CrawlWorker } from './scan/crawl-worker.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const worker = app.get(CrawlWorker);
  await worker.start();
  console.log('Crawl worker started');
}

bootstrap();
