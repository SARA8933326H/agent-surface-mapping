import { ScanDetailsDto } from '@surface/shared';

export function generateJsonReport(scan: ScanDetailsDto): string {
  return JSON.stringify(
    {
      metadata: {
        scanId: scan.id,
        url: scan.url,
        status: scan.status,
        createdAt: scan.createdAt,
        updatedAt: scan.updatedAt,
        durationMs: scan.durationMs,
      },
      summary: {
        pages: scan.pages.length,
        forms: scan.forms.length,
        endpoints: scan.endpoints.length,
        assets: scan.assets.length,
        risks: scan.risks.length,
        techStack: scan.techStack || [],
      },
      pages: scan.pages,
      forms: scan.forms,
      endpoints: scan.endpoints,
      assets: scan.assets,
      classifications: scan.classifications,
      risks: scan.risks,
      graph: scan.graph,
      errors: scan.errors,
    },
    null,
    2,
  );
}
