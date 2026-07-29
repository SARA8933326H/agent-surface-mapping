import * as http from 'http';
import { AddressInfo } from 'net';
import { AssetType, EndpointType } from '@surface/shared';
import { runActiveProbes } from './active-probes';

jest.setTimeout(30000);

function startServer(handler: http.RequestListener): Promise<{ server: http.Server; url: string }> {
  return new Promise((resolve) => {
    const server = http.createServer(handler);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address() as AddressInfo;
      resolve({ server, url: `http://127.0.0.1:${port}` });
    });
  });
}

function closeServer(server: http.Server): Promise<void> {
  return new Promise((resolve) => server.close(() => resolve()));
}

const vulnerableHandler: http.RequestListener = (req, res) => {
  if (req.method === 'TRACE') {
    res.writeHead(200, { 'Content-Type': 'message/http' });
    res.end(`TRACE / HTTP/1.1\r\nX-Probe: ${req.headers['x-probe'] || ''}`);
    return;
  }
  if (req.method === 'OPTIONS') {
    res.writeHead(204, { Allow: 'GET, POST, PUT, DELETE, TRACE' });
    res.end();
    return;
  }
  if (req.headers.origin) {
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  res.setHeader('Set-Cookie', 'sessionid=abc123; Path=/');
  if (req.url === '/.git/HEAD') {
    res.writeHead(200).end('ref: refs/heads/main\n');
    return;
  }
  if (req.url === '/.env') {
    res.writeHead(200).end('DB_PASSWORD=hunter2\n');
    return;
  }
  if (req.url === '/backup.zip') {
    res.writeHead(200).end('PK\x03\x04fake-zip-content');
    return;
  }
  if (req.url === '/static/' || req.url === '/static') {
    res.writeHead(200, { 'Content-Type': 'text/html' }).end('<html><title>Index of /static</title><body>Index of /static</body></html>');
    return;
  }
  if (req.url === '/graphql' && req.method === 'POST') {
    res.writeHead(200, { 'Content-Type': 'application/json' }).end('{"data":{"__schema":{"queryType":{"name":"Query"}}}}');
    return;
  }
  res.writeHead(200, { 'Content-Type': 'text/html' }).end('<html><body>hi</body></html>');
};

const hardenedHandler: http.RequestListener = (req, res) => {
  res.setHeader('Set-Cookie', 'sessionid=abc; Path=/; Secure; HttpOnly; SameSite=Strict');
  res.writeHead(404).end('not found');
};

describe('runActiveProbes (integration, live fixture servers)', () => {
  it('detects the planted vulnerabilities on a vulnerable server', async () => {
    const { server, url } = await startServer(vulnerableHandler);
    try {
      const findings = await runActiveProbes(url, 3000, {
        assets: [{ url: `${url}/static/app.js`, type: AssetType.SCRIPT, discoveredFrom: url }],
        endpoints: [{ url: `${url}/graphql`, method: 'POST', type: EndpointType.GRAPHQL, discoveredFrom: url }],
      });
      const categories = findings.map((f) => f.category);

      expect(categories).toContain('Exposed .git Directory');
      expect(categories).toContain('Exposed Environment File');
      expect(categories).toContain('Exposed Backup Archive');
      expect(categories).toContain('Dangerous HTTP Methods Enabled');
      expect(categories).toContain('TRACE Method Enabled (XST)');
      expect(categories).toContain('CORS Reflects Arbitrary Origins With Credentials');
      expect(categories).toContain('Cookie Missing Security Flags');
      expect(categories).toContain('Site Served Over Plain HTTP');
      expect(categories).toContain('Directory Listing Enabled');
      expect(categories).toContain('GraphQL Introspection Enabled');

      // Not planted -> must not be reported (no false positives)
      expect(categories).not.toContain('Exposed .svn Directory');
      expect(categories).not.toContain('Exposed phpinfo() Page');
      expect(categories).not.toContain('Exposed Database Backup');

      expect(findings.every((f) => f.source === 'DETECTED' && f.evidence && f.remediation)).toBe(true);
    } finally {
      await closeServer(server);
    }
  });

  it('reports nothing on a hardened server', async () => {
    const { server, url } = await startServer(hardenedHandler);
    try {
      const findings = await runActiveProbes(url, 3000);
      expect(findings).toEqual([]);
    } finally {
      await closeServer(server);
    }
  });
});
