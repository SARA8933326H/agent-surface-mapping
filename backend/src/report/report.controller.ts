import { Controller, Get, Param, Post, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { ReportService } from './report.service';

@ApiTags('Reports')
@Controller('reports')
export class ReportController {
  constructor(private reportService: ReportService) {}

  @Post('scans/:scanId/:format')
  async generate(
    @Param('scanId') scanId: string,
    @Param('format') format: string,
  ) {
    const fmt = format.toUpperCase() as 'PDF' | 'MARKDOWN' | 'JSON';
    return this.reportService.generate(scanId, fmt);
  }

  @Get(':id/download')
  async download(@Param('id') id: string, @Res() res: Response) {
    const report = await this.reportService.findOne(id);
    return res.download(report.path);
  }
}
