import { ScanForm } from '@/components/scan-form';
import { ScanList } from '@/components/scan-list';

export default function ScansPage() {
  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <h1 className="mb-6 text-3xl font-bold text-white">Scans</h1>
      <section className="mb-10 rounded-2xl border border-border bg-surface p-6">
        <h2 className="mb-4 text-xl font-semibold text-white">Start a New Discovery</h2>
        <ScanForm />
      </section>
      <ScanList />
    </main>
  );
}
