import { Injectable, NotFoundException } from '@nestjs/common';
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
  ScanDto,
  ScanStatus,
  ScanStatsDto,
} from '@surface/shared';
import { PrismaService } from '../prisma/prisma.service';
import { CrawlQueueService } from '../queue/crawl-queue.service';

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
    const scan = await this.prisma.scan.create({
      data: {
        url: dto.url,
        status: ScanStatus.PENDING,
        progress: 0,
        options: dto.options as any,
      },
    });
    await this.queue.add({ scanId: scan.id, url: dto.url, options: dto.options || {} });
    return this.toScanDto(scan);
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
      riskScore,
      authPages,
      adminPages,
      apiEndpoints,
      graphqlEndpoints,
      techStack,
    };
  }

  private toScanDto(scan: { id: string; url: string; status: string; progress: number; createdAt: Date; updatedAt: Date }): ScanDto {
    return {
      id: scan.id,
      url: scan.url,
      status: scan.status as ScanStatus,
      progress: scan.progress,
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
