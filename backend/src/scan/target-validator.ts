import { BadRequestException } from '@nestjs/common';
import { promises as dns } from 'dns';
import { isIP } from 'net';

const BLOCKED_HOSTNAMES = ['localhost', 'localhost.localdomain', 'ip6-localhost'];
const BLOCKED_SUFFIXES = ['.local', '.internal', '.localhost', '.corp', '.lan'];

/**
 * Returns true for loopback, private, link-local, reserved, and
 * multicast addresses (IPv4, IPv6, and IPv4-mapped IPv6).
 */
export function isPrivateIp(ip: string): boolean {
  const lower = ip.toLowerCase();

  if (lower.includes(':')) {
    if (lower === '::1' || lower === '::') return true;
    if (lower.startsWith('fe80')) return true; // link-local
    if (lower.startsWith('fc') || lower.startsWith('fd')) return true; // unique local
    if (lower.startsWith('ff')) return true; // multicast
    const mapped = lower.match(/::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/);
    if (mapped) return isPrivateIp(mapped[1]);
    return false;
  }

  const parts = lower.split('.').map((p) => parseInt(p, 10));
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n) || n < 0 || n > 255)) return true; // unparseable -> block
  const [a, b, c] = parts;

  if (a === 0 || a === 10 || a === 127) return true; // current net, RFC1918, loopback
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  if (a === 169 && b === 254) return true; // link-local (incl. cloud metadata 169.254.169.254)
  if (a === 172 && b >= 16 && b <= 31) return true; // RFC1918
  if (a === 192 && b === 168) return true; // RFC1918
  if (a === 192 && b === 0) return true; // IETF protocol assignments / TEST-NET-1
  if (a === 198 && (b === 18 || b === 19)) return true; // benchmarking
  if (a === 198 && b === 51 && c === 100) return true; // TEST-NET-2
  if (a === 203 && b === 0 && c === 113) return true; // TEST-NET-3
  if (a >= 224) return true; // multicast + reserved
  return false;
}

/**
 * Rejects scan targets that could be used for SSRF: non-HTTP(S) schemes,
 * internal hostnames, and anything resolving to a private/reserved IP.
 */
export async function assertPublicTarget(rawUrl: string): Promise<void> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new BadRequestException('url is not a valid URL');
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new BadRequestException('Only http:// and https:// targets are allowed');
  }

  const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, ''); // strip IPv6 brackets
  if (BLOCKED_HOSTNAMES.includes(hostname) || BLOCKED_SUFFIXES.some((s) => hostname.endsWith(s))) {
    throw new BadRequestException('Scans against internal hostnames are not allowed');
  }

  if (isIP(hostname) && isPrivateIp(hostname)) {
    throw new BadRequestException('Scans against private or reserved IP addresses are not allowed');
  }

  // Resolve DNS and reject if ANY record points at a private address.
  let addresses: { address: string }[];
  try {
    addresses = await dns.lookup(hostname, { all: true });
  } catch {
    throw new BadRequestException(`Hostname '${hostname}' could not be resolved`);
  }
  for (const { address } of addresses) {
    if (isPrivateIp(address)) {
      throw new BadRequestException(`Target '${hostname}' resolves to an internal address (${address}), which is not allowed`);
    }
  }
}
