import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EndpointExtract } from '@surface/shared';

export function ApisTable({ endpoints }: { endpoints: EndpointExtract[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Discovered Endpoints ({endpoints.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Method</TableHead>
              <TableHead>URL</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Content-Type</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {endpoints.map((ep, idx) => (
              <TableRow key={idx}>
                <TableCell className="font-medium text-white">{ep.method || 'GET'}</TableCell>
                <TableCell className="max-w-md truncate">{ep.url}</TableCell>
                <TableCell>{ep.type}</TableCell>
                <TableCell>{ep.contentType || '-'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
