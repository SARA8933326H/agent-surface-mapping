'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ScanStatus } from '@surface/shared';

/** Re-fetches the server-rendered page while the scan is active so
 *  progress and status update without a manual reload. */
export function ScanRefresher({ status }: { status: ScanStatus }) {
  const router = useRouter();
  const active = status === ScanStatus.PENDING || status === ScanStatus.RUNNING;

  useEffect(() => {
    if (!active) return;
    const interval = setInterval(() => router.refresh(), 4000);
    return () => clearInterval(interval);
  }, [active, router]);

  return null;
}
