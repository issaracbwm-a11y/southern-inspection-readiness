import * as React from 'react'
import { cn } from '@/lib/utils'

export const Badge = ({ className, ...p }: React.HTMLAttributes<HTMLSpanElement>) => (
  <span className={cn('inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold', className)} {...p} />
)

export function Progress({ value, className, barClass }: { value: number; className?: string; barClass?: string }) {
  return (
    <div className={cn('h-2 w-full overflow-hidden rounded-full bg-muted', className)}>
      <div className={cn('h-full rounded-full bg-primary transition-all', barClass)} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  )
}
