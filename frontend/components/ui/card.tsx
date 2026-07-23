import { cn } from '@/lib/utils';
import { HTMLAttributes } from 'react';

export function Card({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('rounded-xl border border-border bg-surface p-5 shadow-sm', className)} {...props}>
      {children}
    </div>
  );
}

export function CardHeader({ className, children }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('mb-4 flex items-center justify-between', className)}>{children}</div>;
}

export function CardTitle({ className, children }: HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn('text-lg font-semibold text-white', className)}>{children}</h3>;
}

export function CardContent({ className, children }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('text-sm text-muted', className)}>{children}</div>;
}
