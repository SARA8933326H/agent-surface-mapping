import { CrawlWorker } from './crawl-worker.service';
import { ScanService } from './scan.service';
import { GraphService } from '../graph/graph.service';
import { RiskService } from '../risk/risk.service';
import { TechService } from '../tech/tech.service';
import { VulnService } from '../vuln/vuln.service';
import { ScanStatus } from '@surface/shared';
import { Config } from '../config';

jest.mock('@surface/crawler', () => ({
  crawlWebsite: jest.fn(),
}));

jest.mock('../config', () => ({
  Config: {
    REDIS_URL: 'redis://localhost:6379',
    SCREENSHOT_DIR: '/tmp/screenshots',
    WORKER_CONCURRENCY: 2,
    DISABLE_LLM: true,
    VULN_CHECKS_ENABLED: true,
    VULN_ACTIVE_PROBES: true,
    VULN_PROBE_TIMEOUT: 5000,
    SCAN_MAX_DURATION_MIN: 1,
  },
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { crawlWebsite } = require('@surface/crawler');

describe('CrawlWorker timeout', () => {
  let worker: CrawlWorker;
  const scanServiceMock = {
    startProcessing: jest.fn(),
    updateProgress: jest.fn(),
    getStatus: jest.fn().mockResolvedValue(ScanStatus.RUNNING),
    complete: jest.fn(),
    fail: jest.fn(),
  };
  const graphServiceMock = { buildGraphData: jest.fn() };
  const riskServiceMock = { matchKnownRisks: jest.fn().mockReturnValue([]) };
  const techServiceMock = { detect: jest.fn().mockReturnValue([]) };
  const vulnServiceMock = { runChecks: jest.fn().mockResolvedValue([]) };

  beforeEach(() => {
    worker = new CrawlWorker(
      scanServiceMock as any,
      graphServiceMock as any,
      riskServiceMock as any,
      techServiceMock as any,
      vulnServiceMock as any,
    );
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await worker.onModuleDestroy();
  });

  it('fails the scan when it exceeds maxDurationMin', async () => {
    crawlWebsite.mockImplementation(async (url: string, opts: any, hooks: any) => {
      // Simulate a long-running crawl that periodically checks for abort.
      while (!(await hooks.shouldAbort())) {
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
      return { pages: [], forms: [], endpoints: [], assets: [], errors: [] };
    });

    const job = {
      data: { scanId: 'scan-1', url: 'http://example.com', options: { maxDurationMin: 0 } },
      opts: { attempts: 1 },
      attemptsMade: 0,
    } as any;

    await worker.process(job);

    expect(scanServiceMock.startProcessing).toHaveBeenCalledWith('scan-1');
    expect(scanServiceMock.fail).toHaveBeenCalledWith(
      'scan-1',
      expect.stringContaining('exceeded maximum allowed duration'),
    );
    expect(scanServiceMock.complete).not.toHaveBeenCalled();
  });
});
