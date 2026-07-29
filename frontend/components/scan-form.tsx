'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createScan } from '@/lib/api';

export function ScanForm() {
  const [url, setUrl] = useState('');
  const [interval, setIntervalMin] = useState('');
  const [maxDuration, setMaxDuration] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const recurringIntervalMin = interval ? parseInt(interval, 10) : undefined;
      const maxDurationMin = maxDuration ? parseInt(maxDuration, 10) : undefined;
      const options = maxDurationMin ? { maxDurationMin } : undefined;
      const scan = await createScan({ url, recurringIntervalMin, options });
      router.push(`/scan/${scan.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start scan');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex w-full max-w-2xl flex-col gap-3 sm:flex-row">
      <Input
        type="url"
        placeholder="https://example.com"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        required
        className="flex-1"
      />
      <Input
        type="number"
        placeholder="Repeat every N min (optional)"
        value={interval}
        onChange={(e) => setIntervalMin(e.target.value)}
        min={15}
        max={10080}
        className="sm:w-56"
        title="Leave empty for a one-off scan. Minimum 15 minutes."
      />
      <Input
        type="number"
        placeholder="Max duration min (optional)"
        value={maxDuration}
        onChange={(e) => setMaxDuration(e.target.value)}
        min={1}
        max={10080}
        className="sm:w-56"
        title="Maximum minutes the scan may run. Defaults to 60 in production."
      />
      <Button type="submit" disabled={loading}>
        {loading ? 'Starting...' : 'Start Discovery'}
      </Button>
      {error && <p className="w-full text-sm text-danger">{error}</p>}
    </form>
  );
}
