import { HealthController } from './health.controller';
import { PrismaService } from '../prisma/prisma.service';
import { CrawlQueueService } from '../queue/crawl-queue.service';
import { ServiceUnavailableException } from '@nestjs/common';

describe('HealthController', () => {
  let controller: HealthController;
  const prismaMock = { $queryRaw: jest.fn() };
  const queueMock = { ping: jest.fn() };

  beforeEach(() => {
    controller = new HealthController(
      prismaMock as unknown as PrismaService,
      queueMock as unknown as CrawlQueueService,
    );
    jest.clearAllMocks();
  });

  it('returns ok when both database and redis are healthy', async () => {
    prismaMock.$queryRaw.mockResolvedValue([{ 1: 1 }]);
    queueMock.ping.mockResolvedValue('PONG');

    const result = await controller.check();

    expect(result.status).toBe('ok');
    expect(result.checks).toEqual({ database: 'ok', redis: 'ok' });
    expect(result.timestamp).toBeDefined();
  });

  it('throws ServiceUnavailable when database is down', async () => {
    prismaMock.$queryRaw.mockRejectedValue(new Error('connection refused'));
    queueMock.ping.mockResolvedValue('PONG');

    await expect(controller.check()).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('throws ServiceUnavailable when redis is down', async () => {
    prismaMock.$queryRaw.mockResolvedValue([{ 1: 1 }]);
    queueMock.ping.mockRejectedValue(new Error('connection refused'));

    await expect(controller.check()).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
