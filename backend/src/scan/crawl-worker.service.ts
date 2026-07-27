import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Worker, Job } from 'bullmq';
import { Redis } from 'ioredis';
import { basename } from 'path';
import { crawlWebsite } from '@surface/crawler';
import { buildClassifications, uniqueFunctionalities, summarizeWithLLM } from '@surface/classifier';
import { QueueJobData, PageExtract, ScanStatus } from '@surface/shared';
import { Config } from '../config';
import { CRAWL_QUEUE_NAME } from '../queue/crawl-queue.service';
import { ScanService } from './scan.service';
import { GraphService } from '../graph/graph.service';
import { RiskService } from '../risk/risk.service';
import { TechService } from '../tech/tech.service';
import { VulnService } from '../vuln/vuln.service';

@Injectable()
export class CrawlWorker implements OnModuleDestroy {
  private worker?: Worker<QueueJobData>;
  private redis: Redis;
  private lastCancelCheck = 0;
  private lastCancelResult = false;

  constructor(
    private scanService: ScanService,
    private graphService: GraphService,
    private riskService: RiskService,
    private techService: TechService,
    private vulnService: VulnService,
  ) {
    this.redis = new Redis(Config.REDIS_URL, { maxRetriesPerRequest: null });
  }

  start(): void {
    if (this.worker) return;
    this.worker = new Worker<QueueJobData>(
      CRAWL_QUEUE_NAME,
      async (job) => this.process(job),
      {
        connection: this.redis,
        concurrency: Config.WORKER_CONCURRENCY,
      },
    );
  }

  /** Throttled DB check so the crawler doesn't hammer Postgres on every page. */
  private async isCancelled(scanId: string): Promise<boolean> {
    const now = Date.now();
    if (now - this.lastCancelCheck < 1000) return this.lastCancelResult;
    this.lastCancelCheck = now;
    this.lastCancelResult = (await this.scanService.getStatus(scanId)) === ScanStatus.CANCELLED;
    return this.lastCancelResult;
  }

  async process(job: Job<QueueJobData>): Promise<void> {
    const { scanId, url, options } = job.data;
    await this.scanService.startProcessing(scanId);
    const start = Date.now();

    try {
      const result = await crawlWebsite(
        url,
        {
          ...options,
          screenshotDir: Config.SCREENSHOT_DIR,
        },
        {
          onProgress: async (crawled, maxPages) => {
            const progress = 10 + Math.min(80, Math.round((crawled / maxPages) * 80));
            await this.scanService.updateProgress(scanId, progress);
          },
          shouldAbort: () => this.isCancelled(scanId),
        },
      );

      // A cancelled scan must not be completed with partial results.
      if ((await this.scanService.getStatus(scanId)) === ScanStatus.CANCELLED) return;

      const pages: PageExtract[] = result.pages.map((p) => ({
        ...p,
        screenshotPath: p.screenshotPath ? `/screenshots/${basename(p.screenshotPath)}` : undefined,
      }));

      const classifications = buildClassifications(pages);
      const graph = this.graphService.buildGraphData(
        pages,
        result.forms,
        result.endpoints,
        result.assets,
        classifications,
      );
      const techStack = this.techService.detect(pages, result.assets);

      const summary = {
        url,
        pageCount: pages.length,
        functionalities: uniqueFunctionalities(classifications),
        endpoints: result.endpoints.map((e) => ({ url: e.url, type: e.type })),
        forms: result.forms.map((f) => ({ action: f.action, method: f.method })),
      };

      let risks = this.riskService.matchKnownRisks(classifications);

      const detected = await this.vulnService.runChecks(url, pages, result.forms, result.assets);
      risks = [...risks, ...detected];

      if (!Config.DISABLE_LLM && Config.OLLAMA_HOST) {
        const llmRisks = await summarizeWithLLM(summary, {
          ollamaHost: Config.OLLAMA_HOST,
          model: Config.OLLAMA_MODEL,
        });
        if (llmRisks) {
          risks = [...risks, ...llmRisks];
        }
      }

      await this.scanService.complete(scanId, {
        pages,
        forms: result.forms,
        endpoints: result.endpoints,
        assets: result.assets,
        classifications,
        graph,
        risks,
        techStack,
        errors: result.errors,
        durationMs: Date.now() - start,
      });
    } catch (error) {
      if ((await this.scanService.getStatus(scanId)) === ScanStatus.CANCELLED) return;
      const message = error instanceof Error ? error.message : String(error);
      const attempts = job.opts.attempts ?? 1;
      if (job.attemptsMade + 1 < attempts) {
        // Let BullMQ retry with backoff; the scan stays RUNNING until the
        // final attempt fails.
        throw error instanceof Error ? error : new Error(message);
      }
      await this.scanService.fail(scanId, message);
    }
  }

  async onModuleDestroy() {
    await this.worker?.close();
    await this.redis.quit();
  }
}
