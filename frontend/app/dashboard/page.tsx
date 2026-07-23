import { ScanForm } from '@/components/scan-form';
import { ScanList } from '@/components/scan-list';
import { listScans } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default async function DashboardPage() {
  const scans = await listScans();
  const completed = scans.filter((s) => s.status === 'COMPLETED').length;
  const running = scans.filter((s) => s.status === 'RUNNING').length;

  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <h1 className="mb-6 text-3xl font-bold text-white">Dashboard</h1>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>Total Scans</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-white">{scans.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-white">{completed}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Running</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-white">{running}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Status</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant={running > 0 ? 'info' : 'success'}>{running > 0 ? 'Active' : 'Idle'}</Badge>
          </CardContent>
        </Card>
      </div>

      <section className="mb-10 rounded-2xl border border-border bg-surface p-6">
        <h2 className="mb-4 text-xl font-semibold text-white">Start a New Discovery</h2>
        <ScanForm />
      </section>

      <ScanList />
    </main>
  );
}
