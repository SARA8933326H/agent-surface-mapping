import { cn } from '@/lib/utils';
import { createContext, ReactNode, useContext, useState } from 'react';

interface TabsContextValue {
  active: string;
  setActive: (value: string) => void;
}

const TabsContext = createContext<TabsContextValue | undefined>(undefined);

export function Tabs({ children, defaultValue }: { children: ReactNode; defaultValue: string }) {
  const [active, setActive] = useState(defaultValue);
  return <TabsContext.Provider value={{ active, setActive }}>{children}</TabsContext.Provider>;
}

export function TabsList({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('flex space-x-1 rounded-lg bg-surface-elevated p-1', className)}>{children}</div>;
}

export function TabsTrigger({ value, children, className }: { value: string; children: ReactNode; className?: string }) {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error('TabsTrigger must be used inside Tabs');
  const active = ctx.active === value;
  return (
    <button
      onClick={() => ctx.setActive(value)}
      className={cn(
        'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
        active ? 'bg-primary text-white' : 'text-muted hover:text-white',
        className,
      )}
    >
      {children}
    </button>
  );
}

export function TabsContent({ value, children, className }: { value: string; children: ReactNode; className?: string }) {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error('TabsContent must be used inside Tabs');
  if (ctx.active !== value) return null;
  return <div className={className}>{children}</div>;
}
