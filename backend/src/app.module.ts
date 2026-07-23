import { Module } from '@nestjs/common';
import { ScanModule } from './scan/scan.module';
import { ReportModule } from './report/report.module';
import { PrismaModule } from './prisma/prisma.module';
import { QueueModule } from './queue/queue.module';
import { HealthController } from './health/health.controller';

@Module({
  imports: [PrismaModule, QueueModule, ScanModule, ReportModule],
  controllers: [HealthController],
})
export class AppModule {}
