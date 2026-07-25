import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { RiskDto } from '@surface/shared';

export function VulnsTable({ vulns }: { vulns: RiskDto[] }) {
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
        <CardTitle>Detected Vulnerabilities ({vulns.length})</CardTitle>
      </CardHeader>
      <CardContent>
        {vulns.length === 0 ? (
          <p className="text-sm text-muted">No vulnerabilities were detected by the passive and active checks.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vulnerability</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Affected URL</TableHead>
                <TableHead>OWASP</TableHead>
                <TableHead>CWE</TableHead>
                <TableHead>Evidence</TableHead>
                <TableHead>Remediation</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vulns.map((vuln) => (
                <TableRow key={vuln.id || `${vuln.category}-${vuln.url}`}>
                  <TableCell className="font-medium text-white">{vuln.category}</TableCell>
                  <TableCell>
                    <Badge variant={severityVariant(vuln.severity)}>{vuln.severity}</Badge>
                  </TableCell>
                  <TableCell className="max-w-xs truncate">{vuln.url || '-'}</TableCell>
                  <TableCell>{vuln.owasp || '-'}</TableCell>
                  <TableCell>{vuln.cwe || '-'}</TableCell>
                  <TableCell className="max-w-md truncate">{vuln.evidence}</TableCell>
                  <TableCell className="max-w-md truncate">{vuln.remediation || '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
