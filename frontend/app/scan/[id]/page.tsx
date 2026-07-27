import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScanTabs } from '@/components/scan-tabs';
import { CancelScanButton } from '@/components/cancel-scan-button';
import { ScanRefresher } from '@/components/scan-refresher';
import { getScan, getScanStats } from '@/lib/api';
import { ScanStatus } from '@surface/shared';

export const dynamic = 'force-dynamic';

export default async function ScanDetailPage({ params }: { params: { id: string } }) {
  const scan = await getScan(params.id);
  const stats = await getScanStats(params.id);
  const active = scan.status === ScanStatus.PENDING || scan.status === ScanStatus.RUNNING;

  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <ScanRefresher status={scan.status} />
      <div className="mb-6 flex items-center gap-4">
        <Link href="/scans">
          <Button variant="ghost" className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
        </Link>
        <h1 className="text-2xl font-bold text-white">Scan Details</h1>
        {active && (
          <span className="ml-auto">
            <CancelScanButton scanId={scan.id} />
          </span>
        )}
      </div>
      <ScanTabs scan={scan} stats={stats} />
    </main>
  );
}
