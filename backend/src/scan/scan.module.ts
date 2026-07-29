import { Module } from '@nestjs/common';
import { ScanController } from './scan.controller';
import { ScanService } from './scan.service';
import { CrawlWorker } from './crawl-worker.service';
import { SchedulerService } from './scheduler.service';
import { PrismaModule } from '../prisma/prisma.module';
import { QueueModule } from '../queue/queue.module';
import { GraphModule } from '../graph/graph.module';
import { RiskModule } from '../risk/risk.module';
import { VulnModule } from '../vuln/vuln.module';
import { TechService } from '../tech/tech.service';

import { CleanupService } from './cleanup.service';

@Module({
  imports: [PrismaModule, QueueModule, GraphModule, RiskModule, VulnModule],
  controllers: [ScanController],
  providers: [ScanService, CrawlWorker, SchedulerService, TechService, CleanupService],
  exports: [ScanService, CrawlWorker, SchedulerService, CleanupService],
})
export class ScanModule {}
