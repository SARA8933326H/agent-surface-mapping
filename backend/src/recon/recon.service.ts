import { Injectable, Logger } from '@nestjs/common';
import { promises as dns } from 'dns';
import * as https from 'https';
import { DomainInfoDto, DnsRecordDto } from '@surface/shared';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const whois = require('whois-json');

interface WhoisJson {
  domain_name?: string | string[];
  registrar?: string;
  registrar_url?: string;
  updated_date?: string | string[];
  creation_date?: string | string[];
  expiration_date?: string | string[];
  name_server?: string | string[];
  dnssec?: string;
  [key: string]: unknown;
}

@Injectable()
export class ReconService {
  private readonly logger = new Logger(ReconService.name);

  async gatherDomainInfo(targetUrl: string): Promise<DomainInfoDto | undefined> {
    try {
      const parsed = new URL(targetUrl);
      const domain = parsed.hostname;
      if (!domain || /^(\d{1,3}\.){3}\d{1,3}$|^\[|^localhost$/i.test(domain)) {
        this.logger.debug(`Skipping recon for non-domain target: ${domain}`);
        return undefined;
      }

      const [whoisInfo, dnsRecords] = await Promise.all([
        this.queryWhois(domain).catch((err) => {
          this.logger.warn(`Whois lookup failed for ${domain}: ${err.message}`);
          return undefined;
        }),
        this.queryDns(domain).catch((err) => {
          this.logger.warn(`DNS lookup failed for ${domain}: ${err.message}`);
          return [] as DnsRecordDto[];
        }),
      ]);

      const waybackUrls = await this.queryWayback(domain).catch((err) => {
        this.logger.warn(`Wayback lookup failed for ${domain}: ${err.message}`);
        return [] as string[];
      });

      return {
        domain,
        registrar: whoisInfo?.registrar,
        expiryDate: whoisInfo?.expiryDate,
        daysUntilExpiry: whoisInfo?.daysUntilExpiry,
        dnssec: whoisInfo?.dnssec,
        nameServers: whoisInfo?.nameServers,
        dnsRecords,
        waybackUrls,
      };
    } catch (err) {
      this.logger.warn(`Domain recon failed for ${targetUrl}: ${(err as Error).message}`);
      return undefined;
    }
  }

  private async queryWhois(domain: string) {
    const data = (await whois(domain)) as WhoisJson;

    const first = (value?: string | string[]): string | undefined => {
      if (!value) return undefined;
      return Array.isArray(value) ? value[0] : value;
    };

    const expiryRaw = first(data.expiration_date);
    let daysUntilExpiry: number | undefined;
    let expiryDate: string | undefined;
    if (expiryRaw) {
      const expiry = new Date(expiryRaw);
      if (!isNaN(expiry.getTime())) {
        expiryDate = expiry.toISOString();
        daysUntilExpiry = Math.floor((expiry.getTime() - Date.now()) / 86400000);
      }
    }

    const nsRaw = data.name_server;
    const nameServers = nsRaw
      ? (Array.isArray(nsRaw) ? nsRaw : [nsRaw]).map((s) => s.trim().toLowerCase())
      : undefined;

    const dnssecRaw = first(data.dnssec);
    const dnssec = dnssecRaw ? /\b(signed|yes)\b/i.test(dnssecRaw) : undefined;

    return {
      registrar: first(data.registrar),
      expiryDate,
      daysUntilExpiry,
      dnssec,
      nameServers,
    };
  }

  private async queryDns(domain: string): Promise<DnsRecordDto[]> {
    const records: DnsRecordDto[] = [];

    const add = (type: string, name: string, value: string, ttl?: number) => {
      records.push({ type, name, value, ttl });
    };

    const queries: { type: string; fn: () => Promise<unknown> }[] = [
      {
        type: 'A',
        fn: async () => {
          const items = await dns.resolve4(domain);
          items.forEach((ip) => add('A', domain, ip));
        },
      },
      {
        type: 'AAAA',
        fn: async () => {
          const items = await dns.resolve6(domain);
          items.forEach((ip) => add('AAAA', domain, ip));
        },
      },
      {
        type: 'CNAME',
        fn: async () => {
          const items = await dns.resolveCname(domain);
          items.forEach((host) => add('CNAME', domain, host));
        },
      },
      {
        type: 'MX',
        fn: async () => {
          const items = await dns.resolveMx(domain);
          items.forEach((mx) => add('MX', domain, `${mx.priority} ${mx.exchange}`));
        },
      },
      {
        type: 'NS',
        fn: async () => {
          const items = await dns.resolveNs(domain);
          items.forEach((ns) => add('NS', domain, ns));
        },
      },
      {
        type: 'SOA',
        fn: async () => {
          const soa = await dns.resolveSoa(domain);
          add('SOA', domain, `${soa.nsname} ${soa.hostmaster} ${soa.serial}`);
        },
      },
      {
        type: 'TXT',
        fn: async () => {
          const items = await dns.resolveTxt(domain);
          items.forEach((txt) => add('TXT', domain, txt.join('')));
        },
      },
      {
        type: 'DMARC',
        fn: async () => {
          const items = await dns.resolveTxt(`_dmarc.${domain}`);
          items.forEach((txt) => add('DMARC', `_dmarc.${domain}`, txt.join('')));
        },
      },
    ];

    await Promise.allSettled(
      queries.map(async (q) => {
        try {
          await q.fn();
        } catch {
          // Record type not present is normal; ignore.
        }
      }),
    );

    return records;
  }

  private async queryWayback(domain: string, limit = 10000): Promise<string[]> {
    const cdxUrl = `https://web.archive.org/cdx/search/cdx?url=*.${domain}/*&output=json&collapse=urlkey&fl=original&filter=statuscode:200&limit=${limit}`;

    return new Promise((resolve, reject) => {
      const req = https.get(cdxUrl, { timeout: 15000 }, (res) => {
        if (res.statusCode && (res.statusCode < 200 || res.statusCode >= 300)) {
          res.resume();
          reject(new Error(`Wayback CDX returned ${res.statusCode}`));
          return;
        }

        let body = '';
        res.on('data', (chunk) => {
          body += chunk;
        });
        res.on('end', () => {
          try {
            const lines = body.trim().split('\n');
            if (lines.length < 2) {
              resolve([]);
              return;
            }
            const urls = lines
              .slice(1)
              .map((line) => {
                try {
                  const parsed = JSON.parse(line);
                  return parsed[0] as string;
                } catch {
                  return null;
                }
              })
              .filter((u): u is string => !!u);
            resolve([...new Set(urls)]);
          } catch (err) {
            reject(err);
          }
        });
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Wayback CDX request timed out'));
      });
    });
  }
}
