'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { generateReport, reportDownloadUrl } from '@/lib/api';
import { ReportDto } from '@surface/shared';

export function ReportsList({ scanId, reports }: { scanId: string; reports: ReportDto[] }) {
  const [format, setFormat] = useState<'PDF' | 'MARKDOWN' | 'JSON'>('PDF');
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<ReportDto[]>(reports);

  async function onGenerate() {
    setLoading(true);
    try {
      const report = await generateReport(scanId, format);
      setItems((prev) => [report, ...prev]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reports</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex gap-2">
          <Select value={format} onChange={(e) => setFormat(e.target.value as 'PDF' | 'MARKDOWN' | 'JSON')}>
            <option value="PDF">PDF</option>
            <option value="MARKDOWN">Markdown</option>
            <option value="JSON">JSON</option>
          </Select>
          <Button onClick={onGenerate} disabled={loading}>
            {loading ? 'Generating...' : 'Generate'}
          </Button>
        </div>
        <ul className="space-y-2">
          {items.map((report) => (
            <li key={report.id} className="flex items-center justify-between rounded-lg border border-border bg-surface-elevated px-4 py-2">
              <span className="text-sm text-white">
                {report.format} — {new Date(report.createdAt).toLocaleString()}
              </span>
              <a
                href={reportDownloadUrl(report.id)}
                className="text-sm font-medium text-primary hover:text-primary-hover"
                download
              >
                Download
              </a>
            </li>
          ))}
          {items.length === 0 && <p className="text-muted">No reports generated yet.</p>}
        </ul>
      </CardContent>
    </Card>
  );
}
