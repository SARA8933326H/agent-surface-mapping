import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ScanService } from './scan.service';

/**
 * Polls for recurring scans whose interval has elapsed and enqueues a fresh
 * scan for the same URL. Runs only in the worker process.
 */
@Injectable()
export class SchedulerService implements OnModuleDestroy {
  private readonly logger = new Logger(SchedulerService.name);
  private timer?: NodeJS.Timeout;

  constructor(private scanService: ScanService) {}

  start(intervalMs = 60_000): void {
    if (this.timer) return;
    this.timer = setInterval(() => {
      this.scanService.enqueueDueRecurringScans().catch((err) => {
        this.logger.warn(`Scheduler tick failed: ${err instanceof Error ? err.message : err}`);
      });
    }, intervalMs);
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }
}
