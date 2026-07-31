import { CleanupService } from './cleanup.service';
import { PrismaService } from '../prisma/prisma.service';
import * as fs from 'fs/promises';
import * as path from 'path';

jest.mock('../config', () => ({
  Config: {
    CLEANUP_ENABLED: true,
    CLEANUP_INTERVAL_MS: 3600000,
    CLEANUP_MAX_AGE_DAYS: 7,
    SCREENSHOT_DIR: '/tmp/screenshots',
    REPORT_DIR: '/tmp/reports',
  },
}));

jest.mock('fs/promises', () => ({
  unlink: jest.fn(),
}));

describe('CleanupService', () => {
  let service: CleanupService;
  const prismaMock = {
    scan: {
      findMany: jest.fn(),
      deleteMany: jest.fn(),
    },
  };

  beforeEach(() => {
    service = new CleanupService(prismaMock as unknown as PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    service.onModuleDestroy();
  });

  it('deletes old scans and their files', async () => {
    prismaMock.scan.findMany.mockResolvedValue([
      {
        id: 'scan-1',
        pages: [{ screenshotPath: '/tmp/screenshots/scan-1.png' }],
        reports: [{ path: '/tmp/reports/scan-1.pdf' }],
      },
    ]);
    prismaMock.scan.deleteMany.mockResolvedValue({ count: 1 });

    await service.run();

    expect(prismaMock.scan.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { createdAt: { lt: expect.any(Date) } },
      }),
    );
    expect(fs.unlink).toHaveBeenCalledWith(path.resolve('/tmp/screenshots/scan-1.png'));
    expect(fs.unlink).toHaveBeenCalledWith(path.resolve('/tmp/reports/scan-1.pdf'));
    expect(prismaMock.scan.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ['scan-1'] } },
    });
  });

  it('does nothing when no scans are old enough', async () => {
    prismaMock.scan.findMany.mockResolvedValue([]);
    await service.run();
    expect(fs.unlink).not.toHaveBeenCalled();
    expect(prismaMock.scan.deleteMany).not.toHaveBeenCalled();
  });

  it('refuses to delete files outside allowed directories', async () => {
    prismaMock.scan.findMany.mockResolvedValue([
      {
        id: 'scan-2',
        pages: [{ screenshotPath: '/etc/passwd' }],
        reports: [],
      },
    ]);
    prismaMock.scan.deleteMany.mockResolvedValue({ count: 1 });

    await service.run();

    expect(fs.unlink).not.toHaveBeenCalled();
    expect(prismaMock.scan.deleteMany).toHaveBeenCalled();
  });
});
