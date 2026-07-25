import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ScanModule } from './scan/scan.module';
import { ReportModule } from './report/report.module';
import { PrismaModule } from './prisma/prisma.module';
import { QueueModule } from './queue/queue.module';
import { HealthController } from './health/health.controller';
import { Config } from './config';

@Module({
  imports: [
    PrismaModule,
    QueueModule,
    ScanModule,
    ReportModule,
    ThrottlerModule.forRoot([
      {
        ttl: Config.RATE_LIMIT_TTL * 1000,
        limit: Config.RATE_LIMIT_LIMIT,
      },
    ]),
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}

