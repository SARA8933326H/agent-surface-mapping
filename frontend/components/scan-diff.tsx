import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScanDiffDto } from '@surface/shared';

function DiffList({ title, items, tone }: { title: string; items: string[]; tone: 'added' | 'removed' }) {
  if (items.length === 0) return null;
  const color = tone === 'added' ? 'text-green-400' : 'text-red-400';
  const sign = tone === 'added' ? '+' : '-';
  return (
    <div className="mb-4">
      <h3 className={`mb-2 text-sm font-semibold ${color}`}>
        {title} ({items.length})
      </h3>
      <ul className="space-y-1 text-sm text-muted">
        {items.map((item) => (
          <li key={item} className="truncate">
            <span className={`mr-2 font-mono ${color}`}>{sign}</span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ScanDiff({ diff }: { diff: ScanDiffDto }) {
  const total =
    diff.pagesAdded.length +
    diff.pagesRemoved.length +
    diff.endpointsAdded.length +
    diff.endpointsRemoved.length +
    diff.vulnsAdded.length +
    diff.vulnsResolved.length;

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Changes vs Previous Scan
          {diff.previousScanAt && (
            <span className="ml-2 text-sm font-normal text-muted">
              (compared to {new Date(diff.previousScanAt).toLocaleString()})
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!diff.previousScanId ? (
          <p className="text-sm text-muted">No previous completed scan of this URL to compare against.</p>
        ) : total === 0 ? (
          <p className="text-sm text-muted">No changes detected since the previous scan.</p>
        ) : (
          <>
            <DiffList title="New Pages" items={diff.pagesAdded} tone="added" />
            <DiffList title="Removed Pages" items={diff.pagesRemoved} tone="removed" />
            <DiffList title="New Endpoints" items={diff.endpointsAdded} tone="added" />
            <DiffList title="Removed Endpoints" items={diff.endpointsRemoved} tone="removed" />
            <DiffList title="New Vulnerabilities" items={diff.vulnsAdded} tone="added" />
            <DiffList title="Resolved Vulnerabilities" items={diff.vulnsResolved} tone="removed" />
          </>
        )}
      </CardContent>
    </Card>
  );
}
