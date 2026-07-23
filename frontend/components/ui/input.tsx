import { cn } from '@/lib/utils';
import { InputHTMLAttributes, forwardRef } from 'react';

const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          'flex w-full rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm text-white placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/50',
          className,
        )}
        {...props}
      />
    );
  },
);
Input.displayName = 'Input';

export { Input };
