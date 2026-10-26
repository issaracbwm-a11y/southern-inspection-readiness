import { AlertTriangle, Info } from 'lucide-react'
import type { PlanIssue } from '@/lib/types'
import { cn } from '@/lib/utils'

export function IssuesBanner({ issues, roundId }: { issues: PlanIssue[]; roundId?: number }) {
  const open = issues.filter((i) => i.status === 'open' && (!roundId || i.roundId === roundId))
  if (open.length === 0) return null
  return (
    <div className="space-y-2">
      {open.map((i) => (
        <div
          key={i.id}
          className={cn(
            'flex gap-3 rounded-xl border px-4 py-3 text-sm',
            i.blocking ? 'border-pending/40 bg-pending-soft' : 'border-border bg-card',
          )}
        >
          {i.blocking ? <AlertTriangle className="mt-0.5 size-5 shrink-0 text-pending" /> : <Info className="mt-0.5 size-5 shrink-0 text-muted-foreground" />}
          <div className="min-w-0">
            <div className={cn('font-semibold', i.blocking && 'text-pending')}>
              {i.title} {i.blocking ? '· กระทบการตัดสินใจ' : '· รายการรอยืนยัน'}
            </div>
            <div className="text-muted-foreground">{i.detail}</div>
            {i.sourceValues && (
              <div className="mt-1 flex flex-wrap gap-2">
                {i.sourceValues.map((v) => (
                  <span key={v.label} className="rounded-md border border-border bg-card px-2 py-0.5 text-xs">
                    {v.label}: <b>{v.value}</b>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
