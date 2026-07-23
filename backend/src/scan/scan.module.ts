import { Module } from '@nestjs/common';
import { ScanController } from './scan.controller';
import { ScanService } from './scan.service';
import { CrawlWorker } from './crawl-worker.service';
import { PrismaModule } from '../prisma/prisma.module';
import { QueueModule } from '../queue/queue.module';
import { GraphModule } from '../graph/graph.module';
import { RiskModule } from '../risk/risk.module';
import { TechService } from '../tech/tech.service';

@Module({
  imports: [PrismaModule, QueueModule, GraphModule, RiskModule],
  controllers: [ScanController],
  providers: [ScanService, CrawlWorker, TechService],
  exports: [ScanService, CrawlWorker],
})
export class ScanModule {}
