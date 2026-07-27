import { AssetExtract, AssetType, FormExtract, PageExtract, Severity } from '@surface/shared';
import {
  checkSecurityHeaders,
  checkVersionDisclosure,
  checkMixedContent,
  checkOutdatedLibraries,
  checkForms,
  runPassiveChecks,
} from './passive-checks';

function makePage(overrides: Partial<PageExtract> = {}): PageExtract {
  return {
    url: 'https://example.com/',
    headers: {},
    cookies: [],
    extractedLinks: [],
    forms: [],
    endpoints: [],
    assets: [],
    depth: 0,
    ...overrides,
  };
}

function makeForm(overrides: Partial<FormExtract> = {}): FormExtract {
  return { fields: [], buttons: [], ...overrides };
}

function makeAsset(url: string, discoveredFrom?: string): AssetExtract {
  return { url, type: AssetType.SCRIPT, discoveredFrom };
}

describe('checkSecurityHeaders', () => {
  it('flags all missing headers on a bare HTTPS page', () => {
    const findings = checkSecurityHeaders([makePage()]);
    const categories = findings.map((f) => f.category);
    expect(categories).toContain('Missing Content-Security-Policy');
    expect(categories).toContain('Missing Clickjacking Protection');
    expect(categories).toContain('Missing X-Content-Type-Options');
    expect(categories).toContain('Missing HTTP Strict Transport Security');
    expect(categories).toContain('Missing Referrer-Policy');
    expect(findings.every((f) => f.source === 'DETECTED')).toBe(true);
    expect(findings.every((f) => f.remediation)).toBe(true);
  });

  it('does not require HSTS on plain HTTP pages', () => {
    const findings = checkSecurityHeaders([makePage({ url: 'http://example.com/' })]);
    expect(findings.map((f) => f.category)).not.toContain('Missing HTTP Strict Transport Security');
  });

  it('returns nothing when all headers are present', () => {
    const page = makePage({
      headers: {
        'content-security-policy': "default-src 'self'",
        'x-frame-options': 'DENY',
        'x-content-type-options': 'nosniff',
        'strict-transport-security': 'max-age=31536000',
        'referrer-policy': 'no-referrer',
      },
    });
    expect(checkSecurityHeaders([page])).toHaveLength(0);
  });

  it('accepts CSP frame-ancestors as clickjacking protection', () => {
    const page = makePage({ headers: { 'content-security-policy': "frame-ancestors 'none'" } });
    const categories = checkSecurityHeaders([page]).map((f) => f.category);
    expect(categories).not.toContain('Missing Clickjacking Protection');
  });

  it('skips error pages', () => {
    const findings = checkSecurityHeaders([makePage({ statusCode: 404 })]);
    expect(findings).toHaveLength(0);
  });

  it('groups repeated missing headers across pages into one finding', () => {
    const pages = [
      makePage({ url: 'https://example.com/' }),
      makePage({ url: 'https://example.com/login' }),
      makePage({ url: 'https://example.com/dashboard' }),
    ];
    const findings = checkSecurityHeaders(pages);
    // 5 headers x 1 grouped finding each, not 5 per page
    expect(findings).toHaveLength(5);
    const csp = findings.find((f) => f.category === 'Missing Content-Security-Policy');
    expect(csp!.evidence).toContain('3 page(s)');
    expect(csp!.evidence).toContain('https://example.com/login');
    expect(csp!.url).toBe('https://example.com/');
  });
});

describe('checkVersionDisclosure', () => {
  it('flags Server and X-Powered-By headers', () => {
    const page = makePage({ headers: { server: 'Apache/2.4.41', 'x-powered-by': 'PHP/5.6.40' } });
    const findings = checkVersionDisclosure([page]);
    expect(findings).toHaveLength(2);
    expect(findings[0].category).toBe('Technology Version Disclosure');
  });

  it('dedupes identical header values across pages', () => {
    const p1 = makePage({ url: 'https://example.com/a', headers: { server: 'nginx/1.18.0' } });
    const p2 = makePage({ url: 'https://example.com/b', headers: { server: 'nginx/1.18.0' } });
    expect(checkVersionDisclosure([p1, p2])).toHaveLength(1);
  });
});

describe('checkMixedContent', () => {
  it('flags HTTP assets loaded from HTTPS pages', () => {
    const findings = checkMixedContent(
      [makePage({ url: 'https://example.com/' })],
      [makeAsset('http://cdn.example.com/app.js', 'https://example.com/')],
    );
    expect(findings).toHaveLength(1);
    expect(findings[0].category).toBe('Mixed Content');
  });

  it('ignores HTTP assets on HTTP pages and HTTPS assets', () => {
    const pages = [makePage({ url: 'http://example.com/' })];
    expect(checkMixedContent(pages, [makeAsset('http://cdn.example.com/a.js', 'http://example.com/')])).toHaveLength(0);
    expect(
      checkMixedContent([makePage()], [makeAsset('https://cdn.example.com/a.js', 'https://example.com/')]),
    ).toHaveLength(0);
  });
});

describe('checkOutdatedLibraries', () => {
  it('flags known-vulnerable jQuery versions', () => {
    const findings = checkOutdatedLibraries([makeAsset('https://example.com/static/jquery-1.12.4.min.js')]);
    expect(findings).toHaveLength(1);
    expect(findings[0].category).toBe('Vulnerable JavaScript Library');
    expect(findings[0].owasp).toContain('A06');
  });

  it('does not flag current jQuery', () => {
    expect(checkOutdatedLibraries([makeAsset('https://example.com/static/jquery-3.7.1.min.js')])).toHaveLength(0);
  });
});

describe('checkForms', () => {
  it('flags password forms submitted over HTTP', () => {
    const form = makeForm({
      method: 'POST',
      action: 'http://example.com/login',
      fields: [{ name: 'password', type: 'password' }],
    });
    const findings = checkForms('http://example.com', [form]);
    const cleartext = findings.find((f) => f.category === 'Credentials Sent Over HTTP');
    expect(cleartext).toBeDefined();
    expect(cleartext!.severity).toBe(Severity.HIGH);
  });

  it('flags POST forms without a CSRF-token-like hidden field', () => {
    const form = makeForm({
      method: 'POST',
      action: 'https://example.com/change-email',
      fields: [{ name: 'email', type: 'text' }],
    });
    const findings = checkForms('https://example.com', [form]);
    expect(findings.map((f) => f.category)).toContain('Possible Missing CSRF Protection');
  });

  it('accepts POST forms carrying a CSRF token', () => {
    const form = makeForm({
      method: 'POST',
      action: 'https://example.com/change-email',
      fields: [
        { name: 'email', type: 'text' },
        { name: 'csrf_token', type: 'hidden' },
      ],
    });
    const findings = checkForms('https://example.com', [form]);
    expect(findings.map((f) => f.category)).not.toContain('Possible Missing CSRF Protection');
  });

  it('ignores GET forms', () => {
    const form = makeForm({ method: 'GET', fields: [{ name: 'q', type: 'text' }] });
    expect(checkForms('https://example.com', [form])).toHaveLength(0);
  });
});

describe('runPassiveChecks', () => {
  it('aggregates all passive check results', () => {
    const findings = runPassiveChecks(
      'http://example.com',
      [makePage({ url: 'http://example.com/', headers: { server: 'nginx/1.18.0' } })],
      [makeForm({ method: 'POST', action: 'http://example.com/login', fields: [{ name: 'password', type: 'password' }] })],
      [makeAsset('http://example.com/jquery-2.2.4.min.js', 'http://example.com/')],
    );
    expect(findings.length).toBeGreaterThan(3);
    expect(findings.every((f) => f.source === 'DETECTED')).toBe(true);
  });
});
