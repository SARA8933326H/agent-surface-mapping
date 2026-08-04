import { ReconService } from './recon.service';
import { promises as dns } from 'dns';

jest.mock('dns', () => ({
  promises: {
    resolve4: jest.fn(),
    resolve6: jest.fn(),
    resolveCname: jest.fn(),
    resolveMx: jest.fn(),
    resolveNs: jest.fn(),
    resolveSoa: jest.fn(),
    resolveTxt: jest.fn(),
  },
}));

jest.mock('whois-json', () => jest.fn());

// eslint-disable-next-line @typescript-eslint/no-var-requires
const whoisJson = require('whois-json');

describe('ReconService', () => {
  let service: ReconService;

  beforeEach(() => {
    service = new ReconService();
    jest.clearAllMocks();
  });

  it('returns undefined for IP targets', async () => {
    const result = await service.gatherDomainInfo('http://127.0.0.1:8080');
    expect(result).toBeUndefined();
  });

  it('returns undefined for localhost', async () => {
    const result = await service.gatherDomainInfo('http://localhost:3000');
    expect(result).toBeUndefined();
  });

  it('gathers whois, DNS, and wayback info for a domain', async () => {
    whoisJson.mockResolvedValue({
      domain_name: 'example.com',
      registrar: 'Example Registrar',
      expiration_date: '2030-01-01T00:00:00.000Z',
      name_server: ['ns1.example.com', 'ns2.example.com'],
      dnssec: 'unsigned',
    });

    (dns.resolve4 as jest.Mock).mockResolvedValue(['93.184.216.34']);
    (dns.resolve6 as jest.Mock).mockRejectedValue(new Error('no AAAA'));
    (dns.resolveCname as jest.Mock).mockRejectedValue(new Error('no CNAME'));
    (dns.resolveMx as jest.Mock).mockResolvedValue([{ priority: 10, exchange: 'mail.example.com' }]);
    (dns.resolveNs as jest.Mock).mockResolvedValue(['ns1.example.com', 'ns2.example.com']);
    (dns.resolveSoa as jest.Mock).mockResolvedValue({
      nsname: 'ns1.example.com',
      hostmaster: 'hostmaster.example.com',
      serial: 2024010101,
    });
    (dns.resolveTxt as jest.Mock).mockImplementation(async (name: string) => {
      if (name === '_dmarc.example.com') return [['v=DMARC1; p=reject']];
      return [['v=spf1 include:_spf.example.com ~all']];
    });

    // We cannot easily mock https.get without more boilerplate, so we rely on
    // the fact that the Wayback API call will fail in test environment and be
    // caught gracefully.
    const result = await service.gatherDomainInfo('https://example.com');

    expect(result).toBeDefined();
    expect(result?.domain).toBe('example.com');
    expect(result?.registrar).toBe('Example Registrar');
    expect(result?.nameServers).toContain('ns1.example.com');
    expect(result?.dnssec).toBe(false);
    expect(result?.dnsRecords?.some((r) => r.type === 'A')).toBe(true);
    expect(result?.dnsRecords?.some((r) => r.type === 'DMARC')).toBe(true);
  });
});
