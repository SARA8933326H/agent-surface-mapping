import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Redis } from 'ioredis';
import { Queue, Job } from 'bullmq';
import { QueueJobData } from '@surface/shared';
import { Config } from '../config';

export const CRAWL_QUEUE_NAME = 'crawl';

@Injectable()
export class CrawlQueueService implements OnModuleDestroy {
  private queue: Queue<QueueJobData>;
  private redis: Redis;

  constructor() {
    this.redis = new Redis(Config.REDIS_URL, { maxRetriesPerRequest: null });
    this.queue = new Queue<QueueJobData>(CRAWL_QUEUE_NAME, {
      connection: this.redis,
      defaultJobOptions: {
        removeOnComplete: 10,
        removeOnFail: 10,
        attempts: Config.QUEUE_ATTEMPTS,
        backoff: {
          type: 'exponential',
          delay: Config.QUEUE_BACKOFF_DELAY,
        },
      },
    });
  }

  async add(data: QueueJobData): Promise<Job<QueueJobData>> {
    return this.queue.add(`crawl-${data.scanId}`, data);
  }

  async onModuleDestroy() {
    await this.queue.close();
    await this.redis.quit();
  }
}
