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
    // jobId = scanId: prevents duplicate queued jobs for one scan and lets
    // cancel() look the job up directly.
    return this.queue.add(`crawl-${data.scanId}`, data, { jobId: data.scanId });
  }

  /**
   * Removes a queued (not yet running) job. Returns the job state before
   * removal, or null if no job exists for the scan.
   */
  async remove(scanId: string): Promise<string | null> {
    const job = await this.queue.getJob(scanId);
    if (!job) return null;
    const state = await job.getState();
    if (state === 'waiting' || state === 'delayed' || state === 'prioritized') {
      await job.remove();
    }
    return state;
  }

  async onModuleDestroy() {
    await this.queue.close();
    await this.redis.quit();
  }
}
