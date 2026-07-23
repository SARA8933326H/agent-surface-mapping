import Link from 'next/link';
import { Shield } from 'lucide-react';

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2 text-white">
          <Shield className="h-6 w-6 text-primary" />
          <span className="font-semibold">Attack Surface</span>
        </Link>
        <nav className="flex items-center gap-6 text-sm font-medium text-muted">
          <Link href="/dashboard" className="hover:text-white">Dashboard</Link>
          <Link href="/scans" className="hover:text-white">Scans</Link>
        </nav>
      </div>
    </header>
  );
}
