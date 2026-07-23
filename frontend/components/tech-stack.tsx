import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export function TechStack({ stack }: { stack: string[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Technology Stack</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {stack.length === 0 && <p className="text-muted">No technology detected.</p>}
          {stack.map((tech) => (
            <Badge key={tech} variant="info">
              {tech}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
