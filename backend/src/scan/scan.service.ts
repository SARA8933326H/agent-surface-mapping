import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import {
  AssetExtract,
  CreateScanDto,
  EndpointExtract,
  FormExtract,
  GraphData,
  PageClassification,
  PageExtract,
  RiskDto,
  ScanDetailsDto,
  ScanDiffDto,
  ScanDto,
  ScanStatus,
  ScanStatsDto,
} from '@surface/shared';
import { PrismaService } from '../prisma/prisma.service';
import { CrawlQueueService } from '../queue/crawl-queue.service';
import { Config } from '../config';
import { assertPublicTarget } from './target-validator';

export interface CompleteScanData {
  pages: PageExtract[];
  forms: FormExtract[];
  endpoints: EndpointExtract[];
  assets: AssetExtract[];
  classifications: PageClassification[];
  graph: GraphData;
  risks: RiskDto[];
  techStack: string[];
  errors: string[];
  durationMs: number;
}

@Injectable()
export class ScanService {
  constructor(
    private prisma: PrismaService,
    private queue: CrawlQueueService,
  ) {}

  async create(dto: CreateScanDto): Promise<ScanDto> {
    if (!Config.ALLOW_PRIVATE_TARGETS) {
      await assertPublicTarget(dto.url);
    }
    const scan = await this.prisma.scan.create({
      data: {
        url: dto.url,
        status: ScanStatus.PENDING,
        progress: 0,
        options: dto.options as any,
        recurringIntervalMin: dto.recurringIntervalMin ?? null,
      },
    });
    await this.queue.add({ scanId: scan.id, url: dto.url, options: dto.options || {} });
    return this.toScanDto(scan);
  }

  /**
   * Enqueues a fresh scan for every recurring scan whose interval has
   * elapsed. Skips URLs that already have an active scan.
   */
  async enqueueDueRecurringScans(): Promise<number> {
    const recurring = await this.prisma.scan.findMany({
      where: {
        recurringIntervalMin: { not: null },
        status: { in: [ScanStatus.COMPLETED, ScanStatus.FAILED, ScanStatus.CANCELLED] },
      },
    });

    let enqueued = 0;
    for (const scan of recurring) {
      const nextDue = scan.updatedAt.getTime() + scan.recurringIntervalMin! * 60_000;
      if (nextDue > Date.now()) continue;

      const active = await this.prisma.scan.findFirst({
        where: { url: scan.url, status: { in: [ScanStatus.PENDING, ScanStatus.RUNNING] } },
      });
      if (active) continue;

      await this.create({
        url: scan.url,
        options: (scan.options as any) || {},
        recurringIntervalMin: scan.recurringIntervalMin!,
      });
      enqueued++;
    }
    return enqueued;
  }

  async findAll(): Promise<ScanDto[]> {
    const scans = await this.prisma.scan.findMany({ orderBy: { createdAt: 'desc' } });
    return scans.map((s) => this.toScanDto(s));
  }

  async findOne(id: string): Promise<ScanDetailsDto> {
    const scan = await this.prisma.scan.findUnique({
      where: { id },
      include: {
        pages: { orderBy: { createdAt: 'asc' } },
        forms: true,
        endpoints: true,
        assets: true,
        risks: true,
        reports: { orderBy: { createdAt: 'desc' } },
        graph: true,
      },
    });
    if (!scan) throw new NotFoundException(`Scan ${id} not found`);
    return this.toScanDetailsDto(scan);
  }

  async startProcessing(id: string): Promise<void> {
    await this.prisma.scan.update({
      where: { id },
      data: { status: ScanStatus.RUNNING, progress: 10, updatedAt: new Date() },
    });
  }

  async updateProgress(id: string, progress: number): Promise<void> {
    await this.prisma.scan.updateMany({
      where: { id, status: ScanStatus.RUNNING },
      data: { progress, updatedAt: new Date() },
    });
  }

  async getStatus(id: string): Promise<ScanStatus | null> {
    const scan = await this.prisma.scan.findUnique({ where: { id }, select: { status: true } });
    return (scan?.status as ScanStatus) ?? null;
  }

  async cancel(id: string): Promise<ScanDto> {
    const scan = await this.prisma.scan.findUnique({ where: { id } });
    if (!scan) throw new NotFoundException(`Scan ${id} not found`);
    if (scan.status !== ScanStatus.PENDING && scan.status !== ScanStatus.RUNNING) {
      throw new BadRequestException(`Scan is ${scan.status} and cannot be cancelled`);
    }

    // Remove the queued job if it hasn't started; a running crawl notices the
    // CANCELLED status via its shouldAbort hook and stops after the current page.
    await this.queue.remove(id);

    const updated = await this.prisma.scan.update({
      where: { id },
      data: { status: ScanStatus.CANCELLED, errors: ['Cancelled by user'], updatedAt: new Date() },
    });
    return this.toScanDto(updated);
  }

  async complete(id: string, data: CompleteScanData): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.page.deleteMany({ where: { scanId: id } });
      await tx.form.deleteMany({ where: { scanId: id } });
      await tx.endpoint.deleteMany({ where: { scanId: id } });
      await tx.asset.deleteMany({ where: { scanId: id } });
      await tx.risk.deleteMany({ where: { scanId: id } });
      await tx.graph.deleteMany({ where: { scanId: id } });

      const urlToPageId = new Map<string, string>();

      for (const page of data.pages) {
        const created = await tx.page.create({
          data: {
            scanId: id,
            url: page.url,
            title: page.title,
            statusCode: page.statusCode,
            contentType: page.contentType,
            headers: page.headers as any,
            cookies: page.cookies as any,
            extractedLinks: page.extractedLinks as any,
            screenshotPath: page.screenshotPath,
            depth: page.depth,
            parentUrl: page.parentUrl,
          },
        });
        urlToPageId.set(page.url, created.id);
      }

      for (const form of data.forms) {
        let pageId: string | null = null;
        for (const page of data.pages) {
          if (page.forms.includes(form)) {
            pageId = urlToPageId.get(page.url) || null;
            break;
          }
        }
        await tx.form.create({
          data: {
            scanId: id,
            pageId,
            action: form.action,
            method: form.method || 'GET',
            selector: form.selector,
            fields: form.fields as any,
            buttons: form.buttons as any,
          },
        });
      }

      for (const endpoint of data.endpoints) {
        const pageId = endpoint.discoveredFrom ? urlToPageId.get(endpoint.discoveredFrom) || null : null;
        await tx.endpoint.create({
          data: {
            scanId: id,
            pageId,
            url: endpoint.url,
            method: endpoint.method || 'GET',
            type: endpoint.type,
            discoveredFrom: endpoint.discoveredFrom,
            contentType: endpoint.contentType,
            statusCode: endpoint.statusCode,
          },
        });
      }

      for (const asset of data.assets) {
        const pageId = asset.discoveredFrom ? urlToPageId.get(asset.discoveredFrom) || null : null;
        await tx.asset.create({
          data: {
            scanId: id,
            pageId,
            url: asset.url,
            type: asset.type,
            discoveredFrom: asset.discoveredFrom,
          },
        });
      }

      for (const risk of data.risks) {
        await tx.risk.create({
          data: {
            scanId: id,
            category: risk.category,
            description: risk.description,
            owasp: risk.owasp,
            cwe: risk.cwe,
            severity: risk.severity,
            evidence: risk.evidence,
            source: risk.source || 'HEURISTIC',
            url: risk.url,
            remediation: risk.remediation,
          },
        });
      }

      await tx.graph.create({
        data: {
          scanId: id,
          nodes: data.graph.nodes as any,
          edges: data.graph.edges as any,
        },
      });

      await tx.scan.update({
        where: { id },
        data: {
          status: ScanStatus.COMPLETED,
          progress: 100,
          durationMs: data.durationMs,
          classifications: data.classifications as any,
          errors: data.errors as any,
          techStack: data.techStack as any,
          updatedAt: new Date(),
        },
      });
    });
  }

  async fail(id: string, error: string): Promise<void> {
    await this.prisma.scan.update({
      where: { id },
      data: {
        status: ScanStatus.FAILED,
        progress: 0,
        errors: [error] as any,
        updatedAt: new Date(),
      },
    });
  }

  async getStats(id: string): Promise<ScanStatsDto> {
    const scan = await this.prisma.scan.findUnique({
      where: { id },
      include: { pages: true, forms: true, endpoints: true, assets: true, risks: true },
    });
    if (!scan) throw new NotFoundException(`Scan ${id} not found`);

    const classifications = (scan.classifications || []) as { url: string; functionality: string[] }[];
    const authPages = scan.pages.filter((p) =>
      classifications.some((c) => c.url === p.url && c.functionality.includes('AUTH')),
    ).length;
    const adminPages = scan.pages.filter((p) =>
      classifications.some((c) => c.url === p.url && c.functionality.includes('ADMIN')),
    ).length;
    const apiEndpoints = scan.endpoints.filter((e) => e.type === 'REST').length;
    const graphqlEndpoints = scan.endpoints.filter((e) => e.type === 'GRAPHQL').length;

    const severityWeights: Record<string, number> = { CRITICAL: 10, HIGH: 7, MEDIUM: 4, LOW: 1, INFO: 0 };
    const raw = scan.risks.reduce((sum, r) => sum + (severityWeights[r.severity] || 0), 0);
    const riskScore = scan.risks.length === 0 ? 0 : Math.min(100, Math.round((raw / (scan.risks.length * 10)) * 100));
    const techStack = Array.isArray(scan.techStack) ? (scan.techStack as string[]) : [];

    return {
      pages: scan.pages.length,
      forms: scan.forms.length,
      endpoints: scan.endpoints.length,
      assets: scan.assets.length,
      risks: scan.risks.length,
      vulnerabilities: scan.risks.filter((r) => r.source === 'DETECTED').length,
      riskScore,
      authPages,
      adminPages,
      apiEndpoints,
      graphqlEndpoints,
      techStack,
    };
  }

  /**
   * Compares a scan with the most recent COMPLETED scan of the same URL
   * before it. Returns an empty diff (previousScanId null) when there is
   * nothing to compare against.
   */
  async getDiff(id: string): Promise<ScanDiffDto> {
    const scan = await this.prisma.scan.findUnique({
      where: { id },
      include: { pages: true, endpoints: true, risks: true },
    });
    if (!scan) throw new NotFoundException(`Scan ${id} not found`);

    const previous = await this.prisma.scan.findFirst({
      where: {
        url: scan.url,
        id: { not: id },
        status: ScanStatus.COMPLETED,
        createdAt: { lt: scan.createdAt },
      },
      orderBy: { createdAt: 'desc' },
      include: { pages: true, endpoints: true, risks: true },
    });

    const empty: ScanDiffDto = {
      previousScanId: null,
      pagesAdded: [],
      pagesRemoved: [],
      endpointsAdded: [],
      endpointsRemoved: [],
      vulnsAdded: [],
      vulnsResolved: [],
    };
    if (!previous) return empty;

    const diff = <T>(current: T[], old: T[], key: (x: T) => string): { added: string[]; removed: string[] } => {
      const oldKeys = new Set(old.map(key));
      const currentKeys = new Set(current.map(key));
      return {
        added: [...currentKeys].filter((k) => !oldKeys.has(k)).sort(),
        removed: [...oldKeys].filter((k) => !currentKeys.has(k)).sort(),
      };
    };

    const pages = diff(scan.pages, previous.pages, (p) => p.url);
    const endpoints = diff(scan.endpoints, previous.endpoints, (e) => `${e.method} ${e.url}`);
    const vulns = diff(
      scan.risks.filter((r) => r.source === 'DETECTED'),
      previous.risks.filter((r) => r.source === 'DETECTED'),
      (r) => `${r.category}|${r.url || ''}`,
    );

    return {
      previousScanId: previous.id,
      previousScanAt: previous.createdAt.toISOString(),
      pagesAdded: pages.added,
      pagesRemoved: pages.removed,
      endpointsAdded: endpoints.added,
      endpointsRemoved: endpoints.removed,
      vulnsAdded: vulns.added,
      vulnsResolved: vulns.removed,
    };
  }

  private toScanDto(scan: { id: string; url: string; status: string; progress: number; recurringIntervalMin?: number | null; createdAt: Date; updatedAt: Date }): ScanDto {
    return {
      id: scan.id,
      url: scan.url,
      status: scan.status as ScanStatus,
      progress: scan.progress,
      recurringIntervalMin: scan.recurringIntervalMin ?? undefined,
      createdAt: scan.createdAt.toISOString(),
      updatedAt: scan.updatedAt.toISOString(),
    };
  }

  private toScanDetailsDto(scan: any): ScanDetailsDto {
    const pageIdToUrl = new Map<string, string>();
    for (const p of scan.pages) pageIdToUrl.set(p.id, p.url);

    const pages: PageExtract[] = scan.pages.map((p: any) => ({
      url: p.url,
      title: p.title || undefined,
      statusCode: p.statusCode || undefined,
      contentType: p.contentType || undefined,
      headers: (p.headers as Record<string, string>) || {},
      cookies: (p.cookies as string[]) || [],
      extractedLinks: (p.extractedLinks as string[]) || [],
      forms: scan.forms.filter((f: any) => f.pageId === p.id).map((f: any) => this.toFormExtract(f)),
      endpoints: scan.endpoints.filter((e: any) => e.pageId === p.id).map((e: any) => this.toEndpointExtract(e)),
      assets: scan.assets.filter((a: any) => a.pageId === p.id).map((a: any) => this.toAssetExtract(a)),
      screenshotPath: p.screenshotPath || undefined,
      depth: p.depth,
      parentUrl: p.parentUrl || undefined,
    }));

    return {
      ...this.toScanDto(scan),
      pages,
      forms: scan.forms.map((f: any) => this.toFormExtract(f)),
      endpoints: scan.endpoints.map((e: any) => this.toEndpointExtract(e)),
      assets: scan.assets.map((a: any) => this.toAssetExtract(a)),
      classifications: (scan.classifications as PageClassification[]) || [],
      graph: scan.graph
        ? ({
            nodes: (scan.graph.nodes as unknown[]) as any,
            edges: (scan.graph.edges as unknown[]) as any,
          } as GraphData)
        : { nodes: [], edges: [] },
      risks: scan.risks.map((r: any) => ({
        id: r.id,
        category: r.category,
        description: r.description,
        owasp: r.owasp,
        cwe: r.cwe,
        severity: r.severity,
        evidence: r.evidence,
        source: r.source || 'HEURISTIC',
        url: r.url || undefined,
        remediation: r.remediation || undefined,
      })),
      reports: scan.reports.map((r: any) => ({
        id: r.id,
        scanId: r.scanId,
        format: r.format,
        path: r.path,
        createdAt: r.createdAt.toISOString(),
      })),
      errors: (scan.errors as string[]) || [],
      durationMs: scan.durationMs,
      techStack: (scan.techStack as string[]) || [],
    };
  }

  private toFormExtract(f: any): FormExtract {
    return {
      action: f.action || undefined,
      method: f.method,
      selector: f.selector || undefined,
      id: f.id,
      fields: (f.fields as any[]) || [],
      buttons: (f.buttons as string[]) || [],
    };
  }

  private toEndpointExtract(e: any): EndpointExtract {
    return {
      url: e.url,
      method: e.method,
      type: e.type,
      discoveredFrom: e.discoveredFrom || undefined,
      contentType: e.contentType || undefined,
      statusCode: e.statusCode || undefined,
    };
  }

  private toAssetExtract(a: any): AssetExtract {
    return {
      url: a.url,
      type: a.type,
      discoveredFrom: a.discoveredFrom || undefined,
    };
  }
}
