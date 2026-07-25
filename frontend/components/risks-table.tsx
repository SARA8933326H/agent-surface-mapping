import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { RiskDto } from '@surface/shared';

export function RisksTable({ risks }: { risks: RiskDto[] }) {
  const severityVariant = (severity: string): 'default' | 'success' | 'warning' | 'danger' | 'info' => {
    switch (severity) {
      case 'CRITICAL':
      case 'HIGH':
        return 'danger';
      case 'MEDIUM':
        return 'warning';
      case 'LOW':
        return 'info';
      default:
        return 'default';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mapped Risks ({risks.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Category</TableHead>
              <TableHead>Severity</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>OWASP</TableHead>
              <TableHead>CWE</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Evidence</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {risks.map((risk) => (
              <TableRow key={risk.id || risk.category}>
                <TableCell className="font-medium text-white">{risk.category}</TableCell>
                <TableCell>
                  <Badge variant={severityVariant(risk.severity)}>{risk.severity}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={risk.source === 'DETECTED' ? 'danger' : 'default'}>{risk.source || 'HEURISTIC'}</Badge>
                </TableCell>
                <TableCell>{risk.owasp || '-'}</TableCell>
                <TableCell>{risk.cwe || '-'}</TableCell>
                <TableCell>{risk.description}</TableCell>
                <TableCell className="max-w-md truncate">{risk.evidence}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
