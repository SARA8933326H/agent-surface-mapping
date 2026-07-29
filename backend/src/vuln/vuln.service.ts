import { Injectable, Logger } from '@nestjs/common';
import { AssetExtract, EndpointExtract, FormExtract, PageExtract, RiskDto } from '@surface/shared';
import { Config } from '../config';
import { runPassiveChecks } from './passive-checks';
import { runActiveProbes } from './active-probes';

@Injectable()
export class VulnService {
  private readonly logger = new Logger(VulnService.name);

  async runChecks(
    targetUrl: string,
    pages: PageExtract[],
    forms: FormExtract[],
    assets: AssetExtract[],
    endpoints: EndpointExtract[] = [],
  ): Promise<RiskDto[]> {
    if (!Config.VULN_CHECKS_ENABLED) return [];

    const findings: RiskDto[] = [...runPassiveChecks(targetUrl, pages, forms, assets)];

    if (Config.VULN_ACTIVE_PROBES) {
      try {
        findings.push(...(await runActiveProbes(targetUrl, Config.VULN_PROBE_TIMEOUT, { endpoints, assets })));
      } catch (error) {
        this.logger.warn(`Active probes failed for ${targetUrl}: ${error instanceof Error ? error.message : error}`);
      }
    }

    return findings;
  }
}
