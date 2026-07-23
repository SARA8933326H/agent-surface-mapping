'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createScan } from '@/lib/api';

export function ScanForm() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const scan = await createScan({ url });
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
      <Button type="submit" disabled={loading}>
        {loading ? 'Starting...' : 'Start Discovery'}
      </Button>
      {error && <p className="w-full text-sm text-danger">{error}</p>}
    </form>
  );
}
