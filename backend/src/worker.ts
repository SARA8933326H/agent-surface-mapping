import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { CrawlWorker } from './scan/crawl-worker.service';
import { SchedulerService } from './scan/scheduler.service';
import { CleanupService } from './scan/cleanup.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const worker = app.get(CrawlWorker);
  await worker.start();
  app.get(SchedulerService).start();
  app.get(CleanupService); // instantiated via OnModuleInit lifecycle hook
  console.log('Crawl worker started');
}

bootstrap();
