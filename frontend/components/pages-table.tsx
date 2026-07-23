import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PageExtract } from '@surface/shared';

export function PagesTable({ pages }: { pages: PageExtract[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Discovered Pages ({pages.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>URL</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Depth</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pages.map((page) => (
              <TableRow key={page.url}>
                <TableCell className="font-medium text-white">{page.title || 'Untitled'}</TableCell>
                <TableCell className="max-w-md truncate">{page.url}</TableCell>
                <TableCell>{page.statusCode || '-'}</TableCell>
                <TableCell>{page.depth}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
