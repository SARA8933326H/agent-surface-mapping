import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { PrismaService } from '../prisma/prisma.service';
import { CrawlQueueService } from '../queue/crawl-queue.service';

@ApiTags('Health')
@SkipThrottle()
@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queue: CrawlQueueService,
  ) {}

  @Get()
  async check() {
    const checks: Record<string, 'ok' | 'error'> = {};
    let healthy = true;

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      checks.database = 'ok';
    } catch (err) {
      checks.database = 'error';
      healthy = false;
    }

    try {
      await this.queue.ping();
      checks.redis = 'ok';
    } catch (err) {
      checks.redis = 'error';
      healthy = false;
    }

    const payload = {
      status: healthy ? 'ok' : 'error',
      timestamp: new Date().toISOString(),
      checks,
    };

    if (!healthy) {
      throw new ServiceUnavailableException(payload);
    }
    return payload;
  }
}
