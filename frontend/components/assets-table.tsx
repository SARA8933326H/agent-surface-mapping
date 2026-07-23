import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AssetExtract } from '@surface/shared';

export function AssetsTable({ assets }: { assets: AssetExtract[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Discovered Assets ({assets.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>URL</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {assets.map((asset, idx) => (
              <TableRow key={idx}>
                <TableCell className="font-medium text-white">{asset.type}</TableCell>
                <TableCell className="max-w-2xl truncate">{asset.url}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
