import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AttackGraph } from '@/components/attack-graph';
import { getScan } from '@/lib/api';

export const dynamic = 'force-dynamic';

export default async function ScanGraphPage({ params }: { params: { id: string } }) {
  const scan = await getScan(params.id);
  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <div className="mb-6 flex items-center gap-4">
        <Link href={`/scan/${params.id}`}>
          <Button variant="ghost" className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
        </Link>
        <h1 className="text-2xl font-bold text-white">Attack Surface Graph</h1>
      </div>
      <AttackGraph graph={scan.graph} />
    </main>
  );
}
