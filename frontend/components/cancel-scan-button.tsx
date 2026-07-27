'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { cancelScan } from '@/lib/api';

export function CancelScanButton({ scanId }: { scanId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onCancel = async () => {
    setLoading(true);
    setError(null);
    try {
      await cancelScan(scanId);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cancel failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <span className="inline-flex items-center gap-2">
      <Button variant="danger" onClick={onCancel} disabled={loading}>
        {loading ? 'Cancelling…' : 'Cancel Scan'}
      </Button>
      {error && <span className="text-sm text-red-400">{error}</span>}
    </span>
  );
}
