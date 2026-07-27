import { AssetExtract, FormExtract, PageExtract, RiskDto, Severity } from '@surface/shared';

/**
 * Passive vulnerability checks. These analyze data already collected by the
 * crawler (response headers, forms, asset URLs) and send no extra requests.
 */

function finding(partial: Omit<RiskDto, 'source'>): RiskDto {
  return { ...partial, source: 'DETECTED' };
}

function headerValue(headers: Record<string, string>, name: string): string | undefined {
  const lower = name.toLowerCase();
  for (const [k, v] of Object.entries(headers)) {
    if (k.toLowerCase() === lower) return v;
  }
  return undefined;
}

const SECURITY_HEADERS: {
  name: string;
  category: string;
  severity: Severity;
  owasp: string;
  cwe: string;
  description: string;
  remediation: string;
  httpsOnly?: boolean;
  alternative?: string;
}[] = [
  {
    name: 'content-security-policy',
    category: 'Missing Content-Security-Policy',
    severity: Severity.MEDIUM,
    owasp: 'A05:2021 Security Misconfiguration',
    cwe: 'CWE-693',
    description: 'The page does not set a Content-Security-Policy header, increasing the impact of any cross-site scripting (XSS) flaw.',
    remediation: 'Define a restrictive Content-Security-Policy, e.g. start with default-src \'self\' and tighten from there.',
  },
  {
    name: 'x-frame-options',
    alternative: 'frame-ancestors',
    category: 'Missing Clickjacking Protection',
    severity: Severity.MEDIUM,
    owasp: 'A05:2021 Security Misconfiguration',
    cwe: 'CWE-1021',
    description: 'Neither X-Frame-Options nor a CSP frame-ancestors directive is set, so the page can be framed by a malicious site (clickjacking).',
    remediation: 'Send X-Frame-Options: DENY or SAMEORIGIN, or add frame-ancestors to the Content-Security-Policy.',
  },
  {
    name: 'x-content-type-options',
    category: 'Missing X-Content-Type-Options',
    severity: Severity.LOW,
    owasp: 'A05:2021 Security Misconfiguration',
    cwe: 'CWE-693',
    description: 'Without X-Content-Type-Options: nosniff, browsers may MIME-sniff responses and execute attacker-controlled content as script.',
    remediation: 'Send X-Content-Type-Options: nosniff on all responses.',
  },
  {
    name: 'strict-transport-security',
    httpsOnly: true,
    category: 'Missing HTTP Strict Transport Security',
    severity: Severity.MEDIUM,
    owasp: 'A02:2021 Cryptographic Failures',
    cwe: 'CWE-319',
    description: 'The HTTPS page does not set Strict-Transport-Security, leaving users exposed to SSL-stripping downgrade attacks.',
    remediation: 'Send Strict-Transport-Security with a long max-age, e.g. max-age=31536000; includeSubDomains.',
  },
  {
    name: 'referrer-policy',
    category: 'Missing Referrer-Policy',
    severity: Severity.LOW,
    owasp: 'A05:2021 Security Misconfiguration',
    cwe: 'CWE-200',
    description: 'No Referrer-Policy is set, so full URLs (which may contain tokens or sensitive paths) can leak to third-party origins.',
    remediation: 'Send Referrer-Policy: strict-origin-when-cross-origin or stricter.',
  },
];

export function checkSecurityHeaders(pages: PageExtract[]): RiskDto[] {
  const findings: RiskDto[] = [];
  const eligible = pages.filter((p) => !(p.statusCode && p.statusCode >= 400));

  // Group by header: one finding per missing header, listing affected pages,
  // instead of one finding per page.
  for (const h of SECURITY_HEADERS) {
    const missingOn: string[] = [];

    for (const page of eligible) {
      const isHttps = page.url.startsWith('https://');
      if (h.httpsOnly && !isHttps) continue;
      let present = headerValue(page.headers, h.name) !== undefined;
      if (!present && h.alternative === 'frame-ancestors') {
        const csp = headerValue(page.headers, 'content-security-policy');
        present = !!csp && /frame-ancestors/i.test(csp);
      }
      if (!present) missingOn.push(page.url);
    }

    if (missingOn.length === 0) continue;
    findings.push(
      finding({
        category: h.category,
        severity: h.severity,
        owasp: h.owasp,
        cwe: h.cwe,
        description: h.description,
        evidence: `Missing on ${missingOn.length} page(s): ${missingOn.slice(0, 3).join(', ')}${missingOn.length > 3 ? `, and ${missingOn.length - 3} more` : ''}`,
        url: missingOn[0],
        remediation: h.remediation,
      }),
    );
  }
  return findings;
}

export function checkVersionDisclosure(pages: PageExtract[]): RiskDto[] {
  const findings: RiskDto[] = [];
  const seen = new Set<string>();

  for (const page of pages) {
    for (const name of ['server', 'x-powered-by', 'x-aspnet-version', 'x-generator']) {
      const value = headerValue(page.headers, name);
      if (!value) continue;
      const key = `${name}|${value}`;
      if (seen.has(key)) continue;
      seen.add(key);
      findings.push(
        finding({
          category: 'Technology Version Disclosure',
          severity: Severity.LOW,
          owasp: 'A05:2021 Security Misconfiguration',
          cwe: 'CWE-200',
          description: `The ${name} header reveals technology details ("${value}") that help attackers select known exploits.`,
          evidence: `${page.url} responded with ${name}: ${value}`,
          url: page.url,
          remediation: 'Remove or genericize version-revealing response headers at the server or reverse-proxy layer.',
        }),
      );
    }
  }
  return findings;
}

export function checkMixedContent(pages: PageExtract[], assets: AssetExtract[]): RiskDto[] {
  const findings: RiskDto[] = [];
  const httpsPages = new Set(pages.filter((p) => p.url.startsWith('https://')).map((p) => p.url));
  const seen = new Set<string>();

  for (const asset of assets) {
    if (!asset.url.startsWith('http://')) continue;
    const from = asset.discoveredFrom || '';
    if (!httpsPages.has(from)) continue;
    const key = asset.url;
    if (seen.has(key)) continue;
    seen.add(key);
    findings.push(
      finding({
        category: 'Mixed Content',
        severity: Severity.MEDIUM,
        owasp: 'A02:2021 Cryptographic Failures',
        cwe: 'CWE-319',
        description: 'An HTTPS page loads a resource over plain HTTP; active mixed content can be tampered with by a network attacker.',
        evidence: `${from} loads ${asset.url} over HTTP.`,
        url: from,
        remediation: 'Serve all subresources over HTTPS and consider upgrade-insecure-requests in the CSP.',
      }),
    );
  }
  return findings;
}

const OUTDATED_LIBS: { pattern: RegExp; name: string; issue: string }[] = [
  { pattern: /jquery[-.]?([12])\.\d+\.\d+(\.min)?\.js/i, name: 'jQuery 1.x/2.x', issue: 'versions before 3.5 have known XSS vulnerabilities (e.g. CVE-2020-11023)' },
  { pattern: /jquery-3\.[0-4]\.\d+(\.min)?\.js/i, name: 'jQuery 3.0–3.4', issue: 'versions before 3.5 have known XSS vulnerabilities (e.g. CVE-2020-11023)' },
  { pattern: /bootstrap[-.]?([123])\.\d+\.\d+(\.min)?\.js/i, name: 'Bootstrap ≤3.x', issue: 'Bootstrap 3.x has known XSS vulnerabilities in tooltip/popover (e.g. CVE-2019-8331)' },
  { pattern: /angular(\.min)?\.js/i, name: 'AngularJS 1.x', issue: 'AngularJS 1.x is end-of-life with unpatched XSS vulnerabilities' },
  { pattern: /angular[-.]?1\.\d+\.\d+(\.min)?\.js/i, name: 'AngularJS 1.x', issue: 'AngularJS 1.x is end-of-life with unpatched XSS vulnerabilities' },
];

export function checkOutdatedLibraries(assets: AssetExtract[]): RiskDto[] {
  const findings: RiskDto[] = [];
  const seen = new Set<string>();

  for (const asset of assets) {
    for (const lib of OUTDATED_LIBS) {
      if (!lib.pattern.test(asset.url)) continue;
      const key = `${lib.name}|${asset.url}`;
      if (seen.has(key)) continue;
      seen.add(key);
      findings.push(
        finding({
          category: 'Vulnerable JavaScript Library',
          severity: Severity.MEDIUM,
          owasp: 'A06:2021 Vulnerable and Outdated Components',
          cwe: 'CWE-1104',
          description: `The site loads ${lib.name}; ${lib.issue}.`,
          evidence: `Detected ${asset.url}${asset.discoveredFrom ? ` referenced by ${asset.discoveredFrom}` : ''}.`,
          url: asset.url,
          remediation: `Upgrade ${lib.name} to a currently supported version.`,
        }),
      );
      break;
    }
  }
  return findings;
}

const CSRF_TOKEN_PATTERN = /csrf|xsrf|token|nonce|authenticity/i;

export function checkForms(targetUrl: string, forms: FormExtract[]): RiskDto[] {
  const findings: RiskDto[] = [];
  const seen = new Set<string>();

  for (const form of forms) {
    const method = (form.method || 'GET').toUpperCase();
    const hasPassword = form.fields.some((f) => (f.type || '').toLowerCase() === 'password');
    const action = form.action || targetUrl;

    if (hasPassword && action.startsWith('http://')) {
      const key = `cleartext|${action}`;
      if (!seen.has(key)) {
        seen.add(key);
        findings.push(
          finding({
            category: 'Credentials Sent Over HTTP',
            severity: Severity.HIGH,
            owasp: 'A02:2021 Cryptographic Failures',
            cwe: 'CWE-319',
            description: 'A form containing a password field submits to a plain-HTTP URL, so credentials travel unencrypted and can be intercepted.',
            evidence: `Password form (${method} ${action}) submits over HTTP.`,
            url: action,
            remediation: 'Serve the site and all form actions exclusively over HTTPS and enable HSTS.',
          }),
        );
      }
    }

    if (method === 'POST' && form.fields.length > 0) {
      const hasToken = form.fields.some((f) => f.name && CSRF_TOKEN_PATTERN.test(f.name) && (f.type || '').toLowerCase() === 'hidden');
      if (!hasToken) {
        const key = `csrf|${action}`;
        if (!seen.has(key)) {
          seen.add(key);
          findings.push(
            finding({
              category: 'Possible Missing CSRF Protection',
              severity: Severity.MEDIUM,
              owasp: 'A01:2021 Broken Access Control',
              cwe: 'CWE-352',
              description: 'A state-changing POST form has no hidden CSRF-token-like field. Unless the app uses SameSite cookies or header-based tokens, it may be vulnerable to cross-site request forgery.',
              evidence: `POST form at ${action} has ${form.fields.length} fields, none matching a CSRF token pattern.`,
              url: action,
              remediation: 'Add per-session anti-CSRF tokens to forms, or enforce SameSite=Strict/Lax cookies plus origin checks.',
            }),
          );
        }
      }
    }
  }
  return findings;
}

export function runPassiveChecks(targetUrl: string, pages: PageExtract[], forms: FormExtract[], assets: AssetExtract[]): RiskDto[] {
  return [
    ...checkSecurityHeaders(pages),
    ...checkVersionDisclosure(pages),
    ...checkMixedContent(pages, assets),
    ...checkOutdatedLibraries(assets),
    ...checkForms(targetUrl, forms),
  ];
}
