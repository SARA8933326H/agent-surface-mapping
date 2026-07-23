import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FormExtract } from '@surface/shared';

export function FormsTable({ forms }: { forms: FormExtract[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Extracted Forms ({forms.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Action</TableHead>
              <TableHead>Method</TableHead>
              <TableHead>Fields</TableHead>
              <TableHead>Buttons</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {forms.map((form, idx) => (
              <TableRow key={idx}>
                <TableCell className="font-medium text-white">{form.action || 'self'}</TableCell>
                <TableCell>{form.method}</TableCell>
                <TableCell>{form.fields.map((f) => `${f.name || f.type}`).join(', ')}</TableCell>
                <TableCell>{form.buttons.join(', ')}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
