import { AssetExtract, EndpointExtract, RiskDto, Severity } from '@surface/shared';
import * as http from 'http';
import * as https from 'https';
import * as tls from 'tls';

/**
 * Active light probes: a small, bounded set of read-only requests
 * (GET / OPTIONS / TRACE) against the target origin. No payloads,
 * no fuzzing, no state-changing methods.
 */

function finding(partial: Omit<RiskDto, 'source'>): RiskDto {
  return { ...partial, source: 'DETECTED' };
}

async function probe(url: string, init: RequestInit, timeoutMs: number): Promise<Response | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal, redirect: 'manual' });
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

const SENSITIVE_PATHS: { path: string; signature: RegExp; category: string; severity: Severity; description: string }[] = [
  {
    path: '/.git/HEAD',
    signature: /^ref: refs\//m,
    category: 'Exposed .git Directory',
    severity: Severity.HIGH,
    description: 'The Git metadata directory is web-accessible. Attackers can reconstruct the full source code, including secrets committed to the repository.',
  },
  {
    path: '/.git/config',
    signature: /\[core\]/,
    category: 'Exposed .git Directory',
    severity: Severity.HIGH,
    description: 'The Git metadata directory is web-accessible. Attackers can reconstruct the full source code, including secrets committed to the repository.',
  },
  {
    path: '/.env',
    signature: /^\s*[A-Z0-9_]+\s*=/im,
    category: 'Exposed Environment File',
    severity: Severity.CRITICAL,
    description: 'A .env file is web-accessible. These files typically contain database credentials and API keys, giving attackers direct access to backend systems.',
  },
  {
    path: '/backup.zip',
    signature: /^PK/,
    category: 'Exposed Backup Archive',
    severity: Severity.HIGH,
    description: 'A ZIP backup archive is web-accessible. Backups typically contain full source code, configuration, and credentials.',
  },
  {
    path: '/backup.sql',
    signature: /CREATE TABLE|INSERT INTO|DROP TABLE/i,
    category: 'Exposed Database Backup',
    severity: Severity.CRITICAL,
    description: 'A SQL database dump is web-accessible, exposing the entire database contents including user data and password hashes.',
  },
  {
    path: '/db.sql',
    signature: /CREATE TABLE|INSERT INTO|DROP TABLE/i,
    category: 'Exposed Database Backup',
    severity: Severity.CRITICAL,
    description: 'A SQL database dump is web-accessible, exposing the entire database contents including user data and password hashes.',
  },
  {
    path: '/config.php.bak',
    signature: /<\?php/i,
    category: 'Exposed Backup File',
    severity: Severity.HIGH,
    description: 'A backup copy of a PHP config file is web-accessible. Backup files often expose source code and credentials that the live file would not.',
  },
  {
    path: '/.svn/entries',
    signature: /^\d+\ndir\n/,
    category: 'Exposed .svn Directory',
    severity: Severity.MEDIUM,
    description: 'Subversion metadata is web-accessible and may allow source-code disclosure.',
  },
  {
    path: '/.DS_Store',
    signature: /Bud1/,
    category: 'Exposed .DS_Store File',
    severity: Severity.LOW,
    description: 'A macOS .DS_Store file is web-accessible and leaks directory listings that help attackers enumerate hidden files.',
  },
  {
    path: '/server-status',
    signature: /apache|server uptime|scoreboard/i,
    category: 'Exposed Server Status Page',
    severity: Severity.MEDIUM,
    description: 'A server-status page is publicly reachable, leaking internal configuration, active requests, and vhost details.',
  },
  {
    path: '/phpinfo.php',
    signature: /phpinfo\(\)|<title>phpinfo/i,
    category: 'Exposed phpinfo() Page',
    severity: Severity.MEDIUM,
    description: 'A phpinfo() page is publicly reachable, disclosing exact PHP version, modules, paths, and environment variables.',
  },
  {
    path: '/actuator',
    signature: /"_links"|"health"/i,
    category: 'Exposed Spring Actuator Endpoints',
    severity: Severity.MEDIUM,
    description: 'Spring Boot Actuator endpoints are publicly reachable and may expose health, metrics, environment variables, or heap dumps.',
  },
  {
    path: '/wp-json/wp/v2/users',
    signature: /"slug"|"name"\s*:/i,
    category: 'WordPress User Enumeration',
    severity: Severity.LOW,
    description: 'The WordPress REST API exposes usernames, enabling targeted brute-force and phishing attacks.',
  },
];

export async function checkSensitivePaths(origin: string, timeoutMs: number): Promise<RiskDto[]> {
  const findings: RiskDto[] = [];
  for (const probeDef of SENSITIVE_PATHS) {
    const url = `${origin}${probeDef.path}`;
    const res = await probe(url, { method: 'GET' }, timeoutMs);
    if (!res || res.status !== 200) continue;
    const body = await res.text().catch(() => '');
    if (!probeDef.signature.test(body.slice(0, 4096))) continue;
    findings.push(
      finding({
        category: probeDef.category,
        severity: probeDef.severity,
        owasp: 'A05:2021 Security Misconfiguration',
        cwe: 'CWE-200',
        description: probeDef.description,
        evidence: `GET ${url} returned 200 with content matching the expected signature.`,
        url,
        remediation: `Block public access to ${probeDef.path} at the web server, and remove deployment artifacts from the web root.`,
      }),
    );
  }
  return findings;
}

/**
 * The Fetch spec forbids TRACE, so this probe uses a raw HTTP request.
 */
function traceProbe(url: string, timeoutMs: number): Promise<{ status: number; body: string } | null> {
  return new Promise((resolve) => {
    const target = new URL(url);
    const transport = target.protocol === 'https:' ? https : http;
    const req = transport.request(
      {
        method: 'TRACE',
        hostname: target.hostname,
        port: target.port || (target.protocol === 'https:' ? 443 : 80),
        path: target.pathname || '/',
        headers: { 'X-Probe': 'surface-trace-check' },
        timeout: timeoutMs,
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => {
          if (body.length < 4096) body += chunk;
        });
        res.on('end', () => resolve({ status: res.statusCode || 0, body }));
      },
    );
    req.on('error', () => resolve(null));
    req.on('timeout', () => {
      req.destroy();
      resolve(null);
    });
    req.end();
  });
}

export async function checkHttpMethods(origin: string, timeoutMs: number): Promise<RiskDto[]> {
  const findings: RiskDto[] = [];

  const options = await probe(origin, { method: 'OPTIONS' }, timeoutMs);
  const allow = options?.headers.get('allow') || options?.headers.get('public') || '';
  const dangerous = ['PUT', 'DELETE', 'TRACE', 'CONNECT'].filter((m) => allow.toUpperCase().includes(m));
  if (dangerous.length > 0) {
    findings.push(
      finding({
        category: 'Dangerous HTTP Methods Enabled',
        severity: Severity.MEDIUM,
        owasp: 'A05:2021 Security Misconfiguration',
        cwe: 'CWE-749',
        description: `The server advertises potentially dangerous HTTP methods (${dangerous.join(', ')}). These can enable file upload/deletion or cross-site tracing attacks.`,
        evidence: `OPTIONS ${origin} returned Allow: ${allow}.`,
        url: origin,
        remediation: 'Disable unneeded HTTP methods (PUT, DELETE, TRACE, CONNECT) at the web server.',
      }),
    );
  }

  const trace = await traceProbe(origin, timeoutMs);
  if (trace && trace.status >= 200 && trace.status < 300) {
    if (/TRACE \/|X-Probe/i.test(trace.body)) {
      findings.push(
        finding({
          category: 'TRACE Method Enabled (XST)',
          severity: Severity.MEDIUM,
          owasp: 'A05:2021 Security Misconfiguration',
          cwe: 'CWE-693',
          description: 'The TRACE method echoes request headers back, enabling cross-site tracing (XST) which can expose HttpOnly cookies.',
          evidence: `TRACE ${origin} returned ${trace.status} and reflected the request.`,
          url: origin,
          remediation: 'Disable the TRACE method at the web server or reverse proxy.',
        }),
      );
    }
  }
  return findings;
}

export async function checkCors(origin: string, timeoutMs: number): Promise<RiskDto[]> {
  const evilOrigin = 'https://attacker.invalid';
  const res = await probe(origin, { method: 'GET', headers: { Origin: evilOrigin } }, timeoutMs);
  if (!res) return [];

  const acao = res.headers.get('access-control-allow-origin');
  const acac = (res.headers.get('access-control-allow-credentials') || '').toLowerCase() === 'true';
  if (!acao) return [];

  if (acao === evilOrigin && acac) {
    return [
      finding({
        category: 'CORS Reflects Arbitrary Origins With Credentials',
        severity: Severity.HIGH,
        owasp: 'A05:2021 Security Misconfiguration',
        cwe: 'CWE-942',
        description: 'The API reflects any Origin in Access-Control-Allow-Origin while allowing credentials, letting any malicious site read authenticated responses.',
        evidence: `Request with Origin: ${evilOrigin} received Access-Control-Allow-Origin: ${acao} and Access-Control-Allow-Credentials: true.`,
        url: origin,
        remediation: 'Maintain an explicit allowlist of trusted origins and never reflect arbitrary origins alongside credentials.',
      }),
    ];
  }
  if (acao === '*') {
    return [
      finding({
        category: 'Overly Permissive CORS Policy',
        severity: acac ? Severity.HIGH : Severity.LOW,
        owasp: 'A05:2021 Security Misconfiguration',
        cwe: 'CWE-942',
        description: `Access-Control-Allow-Origin is *${acac ? ' combined with credentials' : ''}, meaning any website can read responses from this origin.`,
        evidence: `Request with Origin: ${evilOrigin} received Access-Control-Allow-Origin: *.`,
        url: origin,
        remediation: 'Restrict CORS to an explicit allowlist of trusted origins.',
      }),
    ];
  }
  return [];
}

export async function checkInsecureCookies(origin: string, timeoutMs: number): Promise<RiskDto[]> {
  const res = await probe(origin, { method: 'GET' }, timeoutMs);
  if (!res) return [];
  const setCookies = res.headers.getSetCookie?.() ?? [];
  const findings: RiskDto[] = [];
  const isHttps = origin.startsWith('https://');

  for (const cookie of setCookies) {
    const name = cookie.split('=')[0]?.trim() || 'unknown';
    const lower = cookie.toLowerCase();
    const missing: string[] = [];
    if (isHttps && !lower.includes('secure')) missing.push('Secure');
    if (!lower.includes('httponly')) missing.push('HttpOnly');
    if (!lower.includes('samesite')) missing.push('SameSite');
    if (missing.length === 0) continue;
    findings.push(
      finding({
        category: 'Cookie Missing Security Flags',
        severity: missing.includes('HttpOnly') ? Severity.MEDIUM : Severity.LOW,
        owasp: 'A05:2021 Security Misconfiguration',
        cwe: 'CWE-614',
        description: `The cookie "${name}" is set without the ${missing.join(', ')} flag(s). Missing HttpOnly allows XSS to steal it; missing Secure/SameSite weakens transport and CSRF defenses.`,
        evidence: `Set-Cookie for "${name}" at ${origin} lacks: ${missing.join(', ')}.`,
        url: origin,
        remediation: 'Set Secure, HttpOnly, and SameSite=Lax/Strict on all session and sensitive cookies.',
      }),
    );
  }
  return findings;
}

export async function checkHttpsEnforcement(targetUrl: string, timeoutMs: number): Promise<RiskDto[]> {
  if (!targetUrl.startsWith('http://')) return [];
  const res = await probe(targetUrl, { method: 'GET' }, timeoutMs);
  if (!res) return [];
  const location = res.headers.get('location') || '';
  const redirectsToHttps = res.status >= 300 && res.status < 400 && location.startsWith('https://');
  if (redirectsToHttps) return [];
  if (res.status >= 200 && res.status < 300) {
    return [
      finding({
        category: 'Site Served Over Plain HTTP',
        severity: Severity.HIGH,
        owasp: 'A02:2021 Cryptographic Failures',
        cwe: 'CWE-319',
        description: 'The target responds over plain HTTP without redirecting to HTTPS, so all traffic — including credentials — is exposed to network interception.',
        evidence: `GET ${targetUrl} returned ${res.status} over HTTP with no HTTPS redirect.`,
        url: targetUrl,
        remediation: 'Redirect all HTTP traffic to HTTPS and enable HSTS.',
      }),
    ];
  }
  return [];
}

/** TLS protocol version and certificate expiry, via a raw TLS handshake. */
export async function checkTls(targetUrl: string, timeoutMs: number): Promise<RiskDto[]> {
  if (!targetUrl.startsWith('https://')) return [];
  const target = new URL(targetUrl);

  return new Promise<RiskDto[]>((resolve) => {
    const findings: RiskDto[] = [];
    const socket = tls.connect(
      {
        host: target.hostname,
        port: Number(target.port) || 443,
        servername: target.hostname,
        rejectUnauthorized: false, // we inspect the cert instead of trusting it
        timeout: timeoutMs,
      },
      () => {
        const protocol = socket.getProtocol();
        if (protocol && ['TLSv1', 'TLSv1.1', 'SSLv3'].includes(protocol)) {
          findings.push(
            finding({
              category: 'Deprecated TLS Protocol Version',
              severity: Severity.MEDIUM,
              owasp: 'A02:2021 Cryptographic Failures',
              cwe: 'CWE-327',
              description: `The server negotiated ${protocol}, which is deprecated and has known weaknesses (e.g. POODLE, BEAST).`,
              evidence: `TLS handshake with ${target.hostname} negotiated ${protocol}.`,
              url: targetUrl,
              remediation: 'Disable TLS 1.0/1.1 and allow only TLS 1.2+.',
            }),
          );
        }

        const cert = socket.getPeerCertificate();
        if (cert && cert.valid_to) {
          const daysLeft = Math.floor((new Date(cert.valid_to).getTime() - Date.now()) / 86400000);
          if (daysLeft < 0) {
            findings.push(
              finding({
                category: 'Expired TLS Certificate',
                severity: Severity.HIGH,
                owasp: 'A02:2021 Cryptographic Failures',
                cwe: 'CWE-298',
                description: 'The TLS certificate has expired; browsers will show trust warnings and users become conditioned to click through them.',
                evidence: `Certificate for ${target.hostname} expired on ${cert.valid_to}.`,
                url: targetUrl,
                remediation: 'Renew the certificate immediately and automate renewal (e.g. ACME/Let\'s Encrypt).',
              }),
            );
          } else if (daysLeft <= 30) {
            findings.push(
              finding({
                category: 'TLS Certificate Expiring Soon',
                severity: Severity.LOW,
                owasp: 'A02:2021 Cryptographic Failures',
                cwe: 'CWE-298',
                description: `The TLS certificate expires in ${daysLeft} day(s).`,
                evidence: `Certificate for ${target.hostname} expires on ${cert.valid_to}.`,
                url: targetUrl,
                remediation: 'Renew the certificate before expiry.',
              }),
            );
          }
        }

        socket.end();
        resolve(findings);
      },
    );
    socket.on('error', () => resolve([]));
    socket.on('timeout', () => {
      socket.destroy();
      resolve([]);
    });
  });
}

/** Detects Apache/nginx autoindex pages in directories derived from asset URLs. */
export async function checkDirectoryListing(origin: string, assets: AssetExtract[], timeoutMs: number): Promise<RiskDto[]> {
  const dirs = new Set<string>();
  for (const asset of assets) {
    try {
      const url = new URL(asset.url);
      if (url.origin !== origin) continue;
      const dir = url.pathname.replace(/[^/]*$/, '');
      if (dir && dir !== '/') dirs.add(dir);
    } catch { /* ignore malformed asset URLs */ }
  }

  const findings: RiskDto[] = [];
  for (const dir of [...dirs].slice(0, 5)) {
    const url = `${origin}${dir}`;
    const res = await probe(url, { method: 'GET' }, timeoutMs);
    if (!res || res.status !== 200) continue;
    const body = await res.text().catch(() => '');
    if (!/Index of \//i.test(body.slice(0, 4096)) && !/Directory Listing For/i.test(body.slice(0, 4096))) continue;
    findings.push(
      finding({
        category: 'Directory Listing Enabled',
        severity: Severity.MEDIUM,
        owasp: 'A05:2021 Security Misconfiguration',
        cwe: 'CWE-548',
        description: 'The web server exposes a directory index, letting attackers enumerate files — including backups and configs not linked anywhere.',
        evidence: `GET ${url} returned a directory listing page.`,
        url,
        remediation: 'Disable autoindex/Options Indexes at the web server.',
      }),
    );
  }
  return findings;
}

/** Sends a read-only introspection query to discovered GraphQL endpoints. */
export async function checkGraphqlIntrospection(endpoints: EndpointExtract[], timeoutMs: number): Promise<RiskDto[]> {
  const urls = [...new Set(endpoints.filter((e) => e.type === 'GRAPHQL').map((e) => e.url))].slice(0, 3);
  const findings: RiskDto[] = [];

  for (const url of urls) {
    const res = await probe(
      url,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: '{__schema{queryType{name}}}' }),
      },
      timeoutMs,
    );
    if (!res || res.status !== 200) continue;
    const body = await res.text().catch(() => '');
    if (!body.includes('__schema') && !body.includes('queryType')) continue;
    findings.push(
      finding({
        category: 'GraphQL Introspection Enabled',
        severity: Severity.MEDIUM,
        owasp: 'A05:2021 Security Misconfiguration',
        cwe: 'CWE-200',
        description: 'The GraphQL endpoint answers introspection queries, handing attackers a complete map of the API schema, types, and mutations.',
        evidence: `Introspection query to ${url} returned schema data.`,
        url,
        remediation: 'Disable introspection in production or restrict it to authenticated users.',
      }),
    );
  }
  return findings;
}

export async function runActiveProbes(
  targetUrl: string,
  timeoutMs: number,
  context: { endpoints?: EndpointExtract[]; assets?: AssetExtract[] } = {},
): Promise<RiskDto[]> {
  const origin = new URL(targetUrl).origin;
  const results = await Promise.allSettled([
    checkSensitivePaths(origin, timeoutMs),
    checkHttpMethods(origin, timeoutMs),
    checkCors(origin, timeoutMs),
    checkInsecureCookies(origin, timeoutMs),
    checkHttpsEnforcement(targetUrl, timeoutMs),
    checkTls(targetUrl, timeoutMs),
    checkDirectoryListing(origin, context.assets || [], timeoutMs),
    checkGraphqlIntrospection(context.endpoints || [], timeoutMs),
  ]);
  return results.flatMap((r) => (r.status === 'fulfilled' ? r.value : []));
}
