import { Module } from '@nestjs/common';
import { ReportController } from './report.controller';
import { ReportService } from './report.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ScanModule } from '../scan/scan.module';

@Module({
  imports: [PrismaModule, ScanModule],
  controllers: [ReportController],
  providers: [ReportService],
  exports: [ReportService],
})
export class ReportModule {}
