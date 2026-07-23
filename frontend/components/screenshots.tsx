import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageExtract } from '@surface/shared';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export function Screenshots({ pages }: { pages: PageExtract[] }) {
  const shots = pages.filter((p) => p.screenshotPath);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Screenshots ({shots.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {shots.length === 0 && <p className="text-muted">No screenshots available.</p>}
          {shots.map((page) => (
            <div key={page.url} className="overflow-hidden rounded-lg border border-border bg-surface-elevated">
              <img
                src={`${API_URL}${page.screenshotPath}`}
                alt={page.title || page.url}
                className="h-40 w-full object-cover"
              />
              <div className="p-3">
                <p className="truncate text-sm font-medium text-white">{page.title || page.url}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
