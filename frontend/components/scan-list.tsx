import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScanStatusBadge } from '@/components/scan-status-badge';
import { listScans } from '@/lib/api';

export async function ScanList() {
  const scans = await listScans();
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Scans</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>URL</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Progress</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {scans.map((scan) => (
              <TableRow key={scan.id}>
                <TableCell>
                  <Link href={`/scan/${scan.id}`} className="font-medium text-primary hover:underline">
                    {scan.url}
                  </Link>
                </TableCell>
                <TableCell>
                  <ScanStatusBadge status={scan.status} />
                </TableCell>
                <TableCell>{scan.progress}%</TableCell>
                <TableCell>{new Date(scan.createdAt).toLocaleString()}</TableCell>
              </TableRow>
            ))}
            {scans.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-muted">
                  No scans yet. Start one above.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
