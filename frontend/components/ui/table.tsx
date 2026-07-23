import { cn } from '@/lib/utils';
import { TableHTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from 'react';

export function Table({ className, ...props }: TableHTMLAttributes<HTMLTableElement>) {
  return <table className={cn('w-full text-sm text-left', className)} {...props} />;
}

export function TableHeader({ className, ...props }: TableHTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={cn('bg-surface-elevated text-muted uppercase text-xs', className)} {...props} />;
}

export function TableBody({ className, ...props }: TableHTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cn('divide-y divide-border', className)} {...props} />;
}

export function TableRow({ className, ...props }: TableHTMLAttributes<HTMLTableRowElement>) {
  return <tr className={cn('hover:bg-surface-elevated/50 transition-colors', className)} {...props} />;
}

export function TableHead({ className, ...props }: ThHTMLAttributes<HTMLTableHeaderCellElement>) {
  return <th className={cn('px-4 py-3 font-medium', className)} {...props} />;
}

export function TableCell({ className, ...props }: TdHTMLAttributes<HTMLTableDataCellElement>) {
  return <td className={cn('px-4 py-3', className)} {...props} />;
}
