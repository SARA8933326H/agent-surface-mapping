import { DomainInfoDto } from '@surface/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function DomainInfo({ info }: { info?: DomainInfoDto }) {
  if (!info) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Domain Reconnaissance</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted">No domain information available. This may be an IP-based or local target.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Domain Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-xs text-muted">Domain</dt>
              <dd className="text-sm text-white">{info.domain}</dd>
            </div>
            {info.registrar && (
              <div>
                <dt className="text-xs text-muted">Registrar</dt>
                <dd className="text-sm text-white">{info.registrar}</dd>
              </div>
            )}
            {info.expiryDate && (
              <div>
                <dt className="text-xs text-muted">Expiry Date</dt>
                <dd className="text-sm text-white">{new Date(info.expiryDate).toLocaleDateString()}</dd>
              </div>
            )}
            {info.daysUntilExpiry !== undefined && (
              <div>
                <dt className="text-xs text-muted">Days Until Expiry</dt>
                <dd className={`text-sm font-medium ${info.daysUntilExpiry <= 30 ? 'text-danger' : 'text-white'}`}>
                  {info.daysUntilExpiry}
                </dd>
              </div>
            )}
            {info.dnssec !== undefined && (
              <div>
                <dt className="text-xs text-muted">DNSSEC</dt>
                <dd className="text-sm text-white">{info.dnssec ? 'Enabled' : 'Disabled / Unknown'}</dd>
              </div>
            )}
            {info.nameServers && info.nameServers.length > 0 && (
              <div className="sm:col-span-2">
                <dt className="text-xs text-muted">Name Servers</dt>
                <dd className="text-sm text-white">{info.nameServers.join(', ')}</dd>
              </div>
            )}
          </dl>
        </CardContent>
      </Card>

      {info.dnsRecords && info.dnsRecords.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>DNS Records ({info.dnsRecords.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="max-h-96 space-y-1 overflow-auto">
              {info.dnsRecords.map((rec, idx) => (
                <li key={idx} className="text-sm text-white">
                  <span className="rounded bg-surface-elevated px-1.5 py-0.5 text-xs text-muted">{rec.type}</span>{' '}
                  <span className="text-muted">{rec.name}</span> → {rec.value}
                  {rec.ttl !== undefined && <span className="text-muted"> (TTL {rec.ttl})</span>}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {info.waybackUrls && info.waybackUrls.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Wayback Machine URLs ({info.waybackUrls.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="max-h-96 space-y-1 overflow-auto">
              {info.waybackUrls.slice(0, 100).map((url, idx) => (
                <li key={idx} className="break-all text-sm text-primary hover:text-primary-hover">
                  <a href={url} target="_blank" rel="noopener noreferrer">
                    {url}
                  </a>
                </li>
              ))}
              {info.waybackUrls.length > 100 && (
                <li className="text-sm text-muted">...and {info.waybackUrls.length - 100} more</li>
              )}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
