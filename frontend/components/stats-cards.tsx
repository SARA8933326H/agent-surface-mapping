import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScanStatsDto } from '@surface/shared';

export function StatsCards({ stats }: { stats: ScanStatsDto }) {
  const items = [
    { label: 'Pages', value: stats.pages },
    { label: 'Forms', value: stats.forms },
    { label: 'Endpoints', value: stats.endpoints },
    { label: 'Assets', value: stats.assets },
    { label: 'Risks', value: stats.risks },
    { label: 'Vulnerabilities', value: stats.vulnerabilities },
    { label: 'Risk Score', value: stats.riskScore },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <Card key={item.label}>
          <CardHeader>
            <CardTitle>{item.label}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-white">{item.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
