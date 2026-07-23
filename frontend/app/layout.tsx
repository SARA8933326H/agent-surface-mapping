import type { Metadata } from 'next';
import './globals.css';
import { Header } from '@/components/header';

export const metadata: Metadata = {
  title: 'Attack Surface Discovery',
  description: 'Open-source attack surface discovery prototype',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen">
        <Header />
        {children}
      </body>
    </html>
  );
}
