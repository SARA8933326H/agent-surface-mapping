import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { ReportDto } from '@surface/shared';
import { generateJsonReport, generateMarkdownReport, generatePdfReport, generateTxtReport } from '@surface/reports';
import { PrismaService } from '../prisma/prisma.service';
import { ScanService } from '../scan/scan.service';
import { Config } from '../config';

@Injectable()
export class ReportService {
  constructor(
    private prisma: PrismaService,
    private scanService: ScanService,
  ) {}

  async generate(scanId: string, format: 'PDF' | 'MARKDOWN' | 'JSON' | 'TXT'): Promise<ReportDto> {
    const scan = await this.scanService.findOne(scanId);
    if (!scan) throw new NotFoundException(`Scan ${scanId} not found`);

    await mkdir(Config.REPORT_DIR, { recursive: true });
    const ext = format === 'TXT' ? 'txt' : format.toLowerCase();
    const fileName = `report-${scanId}.${ext}`;
    const filePath = join(Config.REPORT_DIR, fileName);

    if (format === 'JSON') {
      const json = generateJsonReport(scan);
      await writeFile(filePath, json, 'utf-8');
    } else if (format === 'MARKDOWN') {
      const md = generateMarkdownReport(scan);
      await writeFile(filePath, md, 'utf-8');
    } else if (format === 'TXT') {
      const txt = generateTxtReport(scan);
      await writeFile(filePath, txt, 'utf-8');
    } else if (format === 'PDF') {
      await generatePdfReport(scan, filePath);
    } else {
      throw new BadRequestException(`Unsupported format: ${format}`);
    }

    const report = await this.prisma.report.create({
      data: {
        scanId,
        format,
        path: filePath,
      },
    });

    return {
      id: report.id,
      scanId: report.scanId,
      format: report.format as 'PDF' | 'MARKDOWN' | 'JSON' | 'TXT',
      path: report.path,
      createdAt: report.createdAt.toISOString(),
    };
  }

  async findOne(id: string): Promise<ReportDto> {
    const report = await this.prisma.report.findUnique({ where: { id } });
    if (!report) throw new NotFoundException(`Report ${id} not found`);
    return {
      id: report.id,
      scanId: report.scanId,
      format: report.format as 'PDF' | 'MARKDOWN' | 'JSON' | 'TXT',
      path: report.path,
      createdAt: report.createdAt.toISOString(),
    };
  }
}
