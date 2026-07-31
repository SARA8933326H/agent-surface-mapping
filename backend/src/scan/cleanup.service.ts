import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Config } from '../config';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Periodic cleanup service that removes scans older than CLEANUP_MAX_AGE_DAYS
 * along with their on-disk screenshots and reports.
 *
 * Intended to run on worker nodes. Set CLEANUP_ENABLED=true on one worker
 * instance to avoid duplicate work.
 */
@Injectable()
export class CleanupService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CleanupService.name);
  private timer?: NodeJS.Timeout;

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit() {
    if (!Config.CLEANUP_ENABLED) {
      this.logger.log('Cleanup disabled; set CLEANUP_ENABLED=true to enable.');
      return;
    }
    this.logger.log(
      `Cleanup enabled: removing scans older than ${Config.CLEANUP_MAX_AGE_DAYS} days every ${Config.CLEANUP_INTERVAL_MS} ms`,
    );
    // Run immediately on startup, then on the configured interval.
    this.run().catch((err) => this.logger.error('Initial cleanup failed', err));
    this.timer = setInterval(() => {
      this.run().catch((err) => this.logger.error('Scheduled cleanup failed', err));
    }, Config.CLEANUP_INTERVAL_MS);
  }

  onModuleDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  async run() {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - Config.CLEANUP_MAX_AGE_DAYS);

    const oldScans = await this.prisma.scan.findMany({
      where: { createdAt: { lt: cutoff } },
      select: {
        id: true,
        pages: { select: { screenshotPath: true } },
        reports: { select: { path: true } },
      },
    });

    if (oldScans.length === 0) {
      this.logger.debug('No scans older than cutoff; nothing to clean.');
      return;
    }

    this.logger.log(`Cleaning ${oldScans.length} scan(s) older than ${cutoff.toISOString()}`);

    for (const scan of oldScans) {
      for (const page of scan.pages) {
        if (page.screenshotPath) {
          await this.safeDelete(page.screenshotPath);
        }
      }
      for (const report of scan.reports) {
        if (report.path) {
          await this.safeDelete(report.path);
        }
      }
    }

    const { count } = await this.prisma.scan.deleteMany({
      where: { id: { in: oldScans.map((s) => s.id) } },
    });

    this.logger.log(`Deleted ${count} scan(s) and their on-disk artifacts.`);
  }

  private async safeDelete(filePath: string) {
    try {
      // Only delete files that live under the configured screenshot/report dirs
      // to avoid accidental deletion outside the project.
      const normalized = path.resolve(filePath);
      const allowedRoots = [path.resolve(Config.SCREENSHOT_DIR), path.resolve(Config.REPORT_DIR)];
      if (!allowedRoots.some((root) => normalized.startsWith(root))) {
        this.logger.warn(`Refusing to delete file outside allowed dirs: ${filePath}`);
        return;
      }
      await fs.unlink(normalized);
    } catch (err) {
      // ENOENT is fine; log other errors but continue.
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
        this.logger.warn(`Failed to delete ${filePath}: ${(err as Error).message}`);
      }
    }
  }
}
