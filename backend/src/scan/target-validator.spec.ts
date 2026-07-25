import { BadRequestException } from '@nestjs/common';
import { isPrivateIp, assertPublicTarget } from './target-validator';

jest.mock('dns', () => ({
  promises: {
    lookup: jest.fn(),
  },
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { promises: dns } = require('dns');
const lookup = dns.lookup as jest.Mock;

describe('isPrivateIp', () => {
  it.each([
    '127.0.0.1',
    '10.0.0.1',
    '10.255.255.255',
    '172.16.0.1',
    '172.31.255.255',
    '192.168.1.1',
    '169.254.169.254', // cloud metadata
    '100.64.0.1', // CGNAT
    '0.0.0.0',
    '224.0.0.1', // multicast
    '192.0.2.1', // TEST-NET-1
    '198.51.100.1', // TEST-NET-2
    '203.0.113.1', // TEST-NET-3
  ])('blocks IPv4 %s', (ip) => {
    expect(isPrivateIp(ip)).toBe(true);
  });

  it.each(['8.8.8.8', '1.1.1.1', '93.184.216.34', '172.15.0.1', '172.32.0.1', '192.167.0.1'])(
    'allows public IPv4 %s',
    (ip) => {
      expect(isPrivateIp(ip)).toBe(false);
    },
  );

  it.each(['::1', '::', 'fe80::1', 'fd00::1', 'fc00::1234', 'ff02::1', '::ffff:127.0.0.1', '::ffff:10.1.2.3'])(
    'blocks IPv6 %s',
    (ip) => {
      expect(isPrivateIp(ip)).toBe(true);
    },
  );

  it.each(['2606:4700:4700::1111', '::ffff:8.8.8.8'])('allows public IPv6 %s', (ip) => {
    expect(isPrivateIp(ip)).toBe(false);
  });

  it('blocks unparseable input', () => {
    expect(isPrivateIp('not-an-ip')).toBe(true);
    expect(isPrivateIp('999.1.2.3')).toBe(true);
  });
});

describe('assertPublicTarget', () => {
  beforeEach(() => lookup.mockReset());

  it('rejects non-HTTP schemes', async () => {
    await expect(assertPublicTarget('ftp://example.com')).rejects.toThrow(BadRequestException);
    await expect(assertPublicTarget('file:///etc/passwd')).rejects.toThrow(BadRequestException);
  });

  it('rejects invalid URLs', async () => {
    await expect(assertPublicTarget('not a url')).rejects.toThrow(BadRequestException);
  });

  it('rejects loopback and private IP literals without DNS', async () => {
    await expect(assertPublicTarget('http://127.0.0.1:8080')).rejects.toThrow(/private or reserved/);
    await expect(assertPublicTarget('http://192.168.0.1/admin')).rejects.toThrow(BadRequestException);
    await expect(assertPublicTarget('http://169.254.169.254/latest/meta-data')).rejects.toThrow(BadRequestException);
    await expect(assertPublicTarget('http://[::1]/')).rejects.toThrow(BadRequestException);
    expect(lookup).not.toHaveBeenCalled();
  });

  it('rejects internal hostnames without DNS', async () => {
    await expect(assertPublicTarget('http://localhost:3000')).rejects.toThrow(/internal hostnames/);
    await expect(assertPublicTarget('http://db.internal')).rejects.toThrow(BadRequestException);
    await expect(assertPublicTarget('http://printer.lan')).rejects.toThrow(BadRequestException);
    expect(lookup).not.toHaveBeenCalled();
  });

  it('rejects public hostnames that resolve to a private address', async () => {
    lookup.mockResolvedValue([{ address: '10.0.0.5' }]);
    await expect(assertPublicTarget('http://sneaky.example.com')).rejects.toThrow(/resolves to an internal address/);
  });

  it('accepts public targets resolving to public addresses', async () => {
    lookup.mockResolvedValue([{ address: '93.184.216.34' }]);
    await expect(assertPublicTarget('https://example.com/path?q=1')).resolves.toBeUndefined();
  });

  it('rejects hostnames that fail DNS resolution', async () => {
    lookup.mockRejectedValue(new Error('ENOTFOUND'));
    await expect(assertPublicTarget('http://does-not-exist.example')).rejects.toThrow(/could not be resolved/);
  });
});
