import Link from 'next/link';
import { ReactNode } from 'react';
import { Shield, ArrowRight, Search, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6">
      <div className="max-w-3xl text-center">
        <div className="mb-6 inline-flex items-center justify-center rounded-full bg-primary/10 p-4">
          <Shield className="h-12 w-12 text-primary" />
        </div>
        <h1 className="mb-4 text-5xl font-bold tracking-tight text-white">Attack Surface Discovery</h1>
        <p className="mb-8 text-lg text-muted">
          A free, open-source prototype that maps your authorized web applications, extracts their
          functionality, and maps it to known OWASP Top 10 and CWE risks.
        </p>
        <div className="flex justify-center gap-4">
          <Link href="/dashboard">
            <Button className="gap-2">
              Open Dashboard <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link href="/scans">
            <Button variant="secondary">View Scans</Button>
          </Link>
        </div>
        <div className="mt-16 grid gap-8 sm:grid-cols-3">
          <Feature icon={<Search className="h-6 w-6" />} title="Crawl & Discover" description="Render SPAs, follow links, parse robots/sitemaps, and capture APIs." />
          <Feature icon={<BarChart3 className="h-6 w-6" />} title="Classify & Map" description="Heuristic + optional LLM classification mapped to OWASP/CWE." />
          <Feature icon={<Shield className="h-6 w-6" />} title="Visualize Risks" description="Interactive attack-surface graph and downloadable reports." />
        </div>
      </div>
    </main>
  );
}

function Feature({ icon, title, description }: { icon: ReactNode; title: string; description: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-6 text-left">
      <div className="mb-3 text-primary">{icon}</div>
      <h3 className="mb-2 font-semibold text-white">{title}</h3>
      <p className="text-sm text-muted">{description}</p>
    </div>
  );
}
