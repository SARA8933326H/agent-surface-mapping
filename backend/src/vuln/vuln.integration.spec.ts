import * as http from 'http';
import { AddressInfo } from 'net';
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
      const findings = await runActiveProbes(url, 3000);
      const categories = findings.map((f) => f.category);

      expect(categories).toContain('Exposed .git Directory');
      expect(categories).toContain('Exposed Environment File');
      expect(categories).toContain('Dangerous HTTP Methods Enabled');
      expect(categories).toContain('TRACE Method Enabled (XST)');
      expect(categories).toContain('CORS Reflects Arbitrary Origins With Credentials');
      expect(categories).toContain('Cookie Missing Security Flags');
      expect(categories).toContain('Site Served Over Plain HTTP');

      // Not planted -> must not be reported (no false positives)
      expect(categories).not.toContain('Exposed .svn Directory');
      expect(categories).not.toContain('Exposed phpinfo() Page');

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
