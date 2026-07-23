import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CreateScanRequestDto } from './dto/create-scan.dto';
import { ScanService } from './scan.service';

@ApiTags('Scans')
@Controller('scans')
export class ScanController {
  constructor(private scanService: ScanService) {}

  @Post()
  async create(@Body() dto: CreateScanRequestDto) {
    const scan = await this.scanService.create({ url: dto.url, options: dto.options });
    return scan;
  }

  @Get()
  async findAll() {
    return this.scanService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.scanService.findOne(id);
  }

  @Get(':id/stats')
  async stats(@Param('id') id: string) {
    return this.scanService.getStats(id);
  }
}
