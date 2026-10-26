import * as React from 'react'
import { AlertTriangle, CalendarRange, MapPin, Package, Users } from 'lucide-react'
import { RESOURCES, UNITS, unitByCode } from '@/data/plan'
import { roundDateRange, roundProvinces, type ResourceSummary, type RoundSummary } from '@/lib/readiness'
import { STATUS, StatusBadge, pctBarClass } from '@/lib/status-ui'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/badge'
import { Dialog } from '@/components/ui/dialog'
import { UnitRoundDialog } from '@/components/UnitRoundDetail'
import { cn } from '@/lib/utils'
import type { UnitCode } from '@/lib/types'

export function ResourceLine({ rs, big = false }: { rs: ResourceSummary; big?: boolean }) {
  const meta = RESOURCES.find((x) => x.key === rs.r)!
  if (rs.planPerDay === 0 && rs.headerTotal === null) {
    return (
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{meta.label}</span>
        <span className="text-xs">ไม่มีในแผน</span>
      </div>
    )
  }
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between gap-2">
        <span className={cn('font-medium', big ? 'text-base' : 'text-sm')}>{meta.label}</span>
        <span className={cn('tabular', big ? 'text-lg' : 'text-sm')}>
          <b className={rs.maxShort > 0 ? 'text-notready' : 'text-ready'}>{rs.minReady}</b>
          <span className="text-muted-foreground"> / {rs.planPerDay} {meta.unit}</span>
          {rs.maxShort > 0 && <span className="ml-1.5 text-xs font-semibold text-notready">ขาด {rs.maxShort}</span>}
        </span>
      </div>
      <Progress value={rs.pct} barClass={pctBarClass(rs.pct)} />
      <div className="text-[11px] text-muted-foreground">ความพร้อม {rs.pct}% (นับรายวัน)</div>
      {rs.conflict && (
        <div className="flex items-center gap-1 text-[11px] font-semibold text-pending">
          <AlertTriangle className="size-3 shrink-0" /> แผนรอยืนยัน: หัวตาราง {rs.headerTotal} {meta.unit} ≠ รายละเอียดรายหน่วยงาน {rs.planPerDay} {meta.unit}
        </div>
      )}
    </div>
  )
}

export function RoundCard({ s, onOpen }: { s: RoundSummary; onOpen?: () => void }) {
  const st = STATUS[s.overall]
  return (
    <Card className={cn('flex flex-col overflow-hidden', onOpen && 'cursor-pointer transition hover:shadow-md')} onClick={onOpen}>
      <div className={cn('h-1.5', st.bar)} />
      <div className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">รอบที่ {s.round.id}</div>
            <div className="text-lg font-bold leading-tight">{s.round.commodity}</div>
          </div>
          <StatusBadge status={s.overall} label={s.overall === 'no_response' && s.answered > 0 ? `รอตอบ ${s.total - s.answered}` : undefined} />
        </div>
        <div className="space-y-1 text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5"><CalendarRange className="size-4" />{roundDateRange(s.round)}</div>
          <div className="flex items-center gap-1.5"><MapPin className="size-4" />{roundProvinces(s.round).join(' · ')}</div>
          <div className="flex items-center gap-1.5"><Package className="size-4" />{s.round.target}</div>
        </div>
        <div className="space-y-2.5 border-t border-border pt-3">
          {s.resources.map((rs) => <ResourceLine key={rs.r} rs={rs} />)}
        </div>
      </div>
      <div className="mt-auto flex items-center justify-between border-t border-border bg-muted/50 px-4 py-2 text-sm">
        <span className="flex items-center gap-1.5"><Users className="size-4 text-muted-foreground" />ตอบแล้ว <b>{s.answered}/{s.total}</b> หน่วยงาน</span>
        {s.openIssues.some((i) => i.blocking) && <span className="text-xs font-semibold text-pending">แผนรอยืนยัน</span>}
      </div>
    </Card>
  )
}

export function ReadinessMatrix({ summaries, roundFilter, large = false }: { summaries: RoundSummary[]; roundFilter?: number; large?: boolean }) {
  const [open, setOpen] = React.useState<{ round: number; unit: UnitCode } | null>(null)
  const cols = roundFilter ? summaries.filter((s) => s.round.id === roundFilter) : summaries
  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[420px] table-fixed border-separate border-spacing-1.5">
          <thead>
            <tr>
              <th className={cn('text-left text-xs font-semibold text-muted-foreground', large ? 'w-40' : 'w-24 sm:w-28')}>หน่วยงาน</th>
              {cols.map((s) => (
                <th key={s.round.id} className="text-center text-xs font-semibold text-muted-foreground">
                  รอบ {s.round.id}
                  <div className="font-normal">{roundDateRange(s.round).replace(/ 25\d\d$/, '')}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {UNITS.map((u) => (
              <tr key={u.code}>
                <td className={cn('pr-2 font-medium', large ? 'text-lg' : 'text-sm')}>{u.short}</td>
                {cols.map((s) => {
                  const cell = s.units.find((x) => x.unit === u.code)
                  if (!cell) return <td key={s.round.id} className="text-center text-xs text-muted-foreground">–</td>
                  const st = STATUS[cell.result.status]
                  return (
                    <td key={s.round.id}>
                      <button
                        onClick={() => setOpen({ round: s.round.id, unit: u.code })}
                        title={cell.result.reasons.join(' · ')}
                        className={cn(
                          'flex w-full flex-col items-center justify-center rounded-lg px-1 text-center transition hover:brightness-95 focus-visible:ring-2 focus-visible:ring-ring',
                          large ? 'min-h-24 gap-1 text-base' : 'min-h-16 gap-0.5 text-xs',
                          st.cell,
                        )}
                      >
                        <st.Icon className={large ? 'size-6' : 'size-4'} />
                        <span className="font-semibold leading-tight">{st.short}</span>
                        {cell.result.status !== 'no_response' && cell.result.status !== 'ready' && (
                          <span className={cn('line-clamp-1 opacity-90', large ? 'text-sm' : 'hidden text-[10px] sm:block')}>{cell.result.reasons[0]}</span>
                        )}
                      </button>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Legend />
      <Dialog open={!!open} onOpenChange={(v) => !v && setOpen(null)}>
        {open && <UnitRoundDialog roundId={open.round} unit={open.unit} />}
      </Dialog>
    </>
  )
}

export function Legend() {
  return (
    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
      {(['ready', 'partial', 'not_ready', 'no_response', 'plan_pending'] as const).map((k) => (
        <span key={k} className="flex items-center gap-1.5">
          <span className={cn('inline-block size-3 rounded', STATUS[k].cell)} />
          {STATUS[k].label}
        </span>
      ))}
      <span className="w-full sm:w-auto">คลิกช่องเพื่อดูรายละเอียด</span>
    </div>
  )
}

export const unitShort = (u: UnitCode) => unitByCode(u).short
