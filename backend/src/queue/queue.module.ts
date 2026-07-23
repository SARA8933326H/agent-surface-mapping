import { Module } from '@nestjs/common';
import { CrawlQueueService } from './crawl-queue.service';

@Module({
  providers: [CrawlQueueService],
  exports: [CrawlQueueService],
})
export class QueueModule {}
