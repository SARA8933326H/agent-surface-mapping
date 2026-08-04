import { ScanDetailsDto } from '@surface/shared';

export function generateTxtReport(scan: ScanDetailsDto): string {
  const lines: string[] = [];

  lines.push('============================================');
  lines.push('       ATTACK SURFACE DISCOVERY REPORT');
  lines.push('============================================');
  lines.push('');
  lines.push(`Target:        ${scan.url}`);
  lines.push(`Scan ID:       ${scan.id}`);
  lines.push(`Status:        ${scan.status}`);
  lines.push(`Created:       ${scan.createdAt}`);
  lines.push(`Updated:       ${scan.updatedAt}`);
  lines.push(`Duration:      ${scan.durationMs}ms`);
  lines.push('');

  lines.push('--------------------------------------------');
  lines.push('EXECUTIVE SUMMARY');
  lines.push('--------------------------------------------');
  lines.push(`Pages discovered:        ${scan.pages.length}`);
  lines.push(`Forms extracted:         ${scan.forms.length}`);
  lines.push(`Endpoints discovered:    ${scan.endpoints.length}`);
  lines.push(`Assets cataloged:        ${scan.assets.length}`);
  lines.push(`Risk findings:          ${scan.risks.length}`);
  lines.push(`Detected vulnerabilities: ${scan.risks.filter((r) => r.source === 'DETECTED').length}`);
  lines.push(`Technology stack:       ${(scan.techStack || []).join(', ') || 'Unknown'}`);
  lines.push('');

  const domainInfo = scan.domainInfo;
  if (domainInfo) {
    lines.push('--------------------------------------------');
    lines.push('DOMAIN RECONNAISSANCE');
    lines.push('--------------------------------------------');
    if (domainInfo.registrar) lines.push(`Registrar:   ${domainInfo.registrar}`);
    if (domainInfo.expiryDate) lines.push(`Expiry Date: ${domainInfo.expiryDate}`);
    if (domainInfo.daysUntilExpiry !== undefined) lines.push(`Days Left:   ${domainInfo.daysUntilExpiry}`);
    if (domainInfo.dnssec !== undefined) lines.push(`DNSSEC:      ${domainInfo.dnssec ? 'Enabled' : 'Disabled/Unknown'}`);
    if (domainInfo.nameServers && domainInfo.nameServers.length > 0) {
      lines.push(`Name Servers: ${domainInfo.nameServers.join(', ')}`);
    }
    if (domainInfo.dnsRecords && domainInfo.dnsRecords.length > 0) {
      lines.push('');
      lines.push('DNS Records:');
      for (const rec of domainInfo.dnsRecords) {
        lines.push(`  [${rec.type}] ${rec.name} -> ${rec.value} (TTL ${rec.ttl || 'n/a'})`);
      }
    }
    if (domainInfo.waybackUrls && domainInfo.waybackUrls.length > 0) {
      lines.push('');
      lines.push(`Wayback Machine URLs: ${domainInfo.waybackUrls.length}`);
      for (const url of domainInfo.waybackUrls.slice(0, 20)) {
        lines.push(`  - ${url}`);
      }
      if (domainInfo.waybackUrls.length > 20) {
        lines.push(`  ... and ${domainInfo.waybackUrls.length - 20} more`);
      }
    }
    lines.push('');
  }

  lines.push('--------------------------------------------');
  lines.push('RISK FINDINGS');
  lines.push('--------------------------------------------');
  if (scan.risks.length === 0) {
    lines.push('No risks were mapped for this target.');
  } else {
    for (const risk of scan.risks) {
      lines.push(`[${risk.severity}] ${risk.category}`);
      lines.push(`  OWASP:       ${risk.owasp || 'N/A'}`);
      lines.push(`  CWE:         ${risk.cwe || 'N/A'}`);
      lines.push(`  Description: ${risk.description}`);
      lines.push(`  Evidence:    ${risk.evidence}`);
      lines.push('');
    }
  }

  lines.push('--------------------------------------------');
  lines.push('DETECTED VULNERABILITIES');
  lines.push('--------------------------------------------');
  const vulnerabilities = scan.risks.filter((r) => r.source === 'DETECTED');
  if (vulnerabilities.length === 0) {
    lines.push('No vulnerabilities were detected by the passive and active checks.');
  } else {
    for (const vuln of vulnerabilities) {
      lines.push(`[${vuln.severity}] ${vuln.category}`);
      lines.push(`  Affected URL: ${vuln.url || 'N/A'}`);
      lines.push(`  OWASP:        ${vuln.owasp || 'N/A'}`);
      lines.push(`  CWE:          ${vuln.cwe || 'N/A'}`);
      lines.push(`  Description:  ${vuln.description}`);
      lines.push(`  Evidence:     ${vuln.evidence}`);
      lines.push(`  Remediation:  ${vuln.remediation || 'N/A'}`);
      lines.push('');
    }
  }

  lines.push('--------------------------------------------');
  lines.push('PAGES');
  lines.push('--------------------------------------------');
  for (const page of scan.pages) {
    lines.push(`- [${page.statusCode || '???'}] ${page.title || 'Untitled'}: ${page.url}`);
  }
  lines.push('');

  lines.push('--------------------------------------------');
  lines.push('FORMS');
  lines.push('--------------------------------------------');
  for (const form of scan.forms) {
    lines.push(`- ${form.method} ${form.action || 'self'} (${form.fields.length} fields)`);
  }
  lines.push('');

  lines.push('--------------------------------------------');
  lines.push('ENDPOINTS');
  lines.push('--------------------------------------------');
  for (const endpoint of scan.endpoints) {
    lines.push(`- ${endpoint.method || 'GET'} ${endpoint.url} (${endpoint.type})`);
  }
  lines.push('');

  lines.push('--------------------------------------------');
  lines.push('ASSETS');
  lines.push('--------------------------------------------');
  for (const asset of scan.assets) {
    lines.push(`- [${asset.type}] ${asset.url}`);
  }
  lines.push('');

  if (scan.errors.length > 0) {
    lines.push('--------------------------------------------');
    lines.push('CRAWLER ERRORS');
    lines.push('--------------------------------------------');
    for (const error of scan.errors) {
      lines.push(`- ${error}`);
    }
    lines.push('');
  }

  lines.push('============================================');
  lines.push('*Generated by Attack Surface Discovery Prototype*');
  return lines.join('\n');
}
