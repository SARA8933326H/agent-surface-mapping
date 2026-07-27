import { Badge } from '@/components/ui/badge';
import { ScanStatus } from '@surface/shared';

export function ScanStatusBadge({ status }: { status: ScanStatus }) {
  const variants: Record<ScanStatus, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
    [ScanStatus.PENDING]: 'warning',
    [ScanStatus.RUNNING]: 'info',
    [ScanStatus.COMPLETED]: 'success',
    [ScanStatus.FAILED]: 'danger',
    [ScanStatus.CANCELLED]: 'default',
  };
  return <Badge variant={variants[status]}>{status}</Badge>;
}
