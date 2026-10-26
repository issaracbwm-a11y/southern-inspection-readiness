import * as React from 'react'
import { useSearchParams } from 'react-router-dom'
import { FilterX } from 'lucide-react'
import { useApp } from '@/lib/app-context'
import { UNITS, unitByCode } from '@/data/plan'
import { dayRows, dayTotals, type DayRow } from '@/lib/rows'
import { thaiDate } from '@/lib/readiness'
import { STATUS, StatusBadge } from '@/lib/status-ui'
import { Card } from '@/components/ui/card'
import { Select } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { UnitRoundDialog } from '@/components/UnitRoundDetail'
import { cn } from '@/lib/utils'
import type { ReadinessStatus, Resource, UnitCode } from '@/lib/types'

export default function DailyPage() {
  const { data } = useApp()
  const [params, setParams] = useSearchParams()
  const f = {
    round: params.get('round') ?? '',
    date: params.get('date') ?? '',
    province: params.get('province') ?? '',
    unit: params.get('unit') ?? '',
    status: params.get('status') ?? '',
  }
  const setF = (k: keyof typeof f, v: string) => {
    const next = new URLSearchParams(params)
    if (v) next.set(k, v)
    else next.delete(k)
    if (k === 'round') next.delete('date')
    setParams(next, { replace: true })
  }
  const [open, setOpen] = React.useState<{ round: number; unit: UnitCode } | null>(null)

  const all = React.useMemo(() => (data ? dayRows(data) : []), [data])
  if (!data) return <p className="text-muted-foreground">กำลังโหลด…</p>

  const base = f.unit === 'ALL' ? dayTotals(all) : all
  const rows = base.filter(
    (r) =>
      (!f.round || r.roundId === Number(f.round)) &&
      (!f.date || r.date === f.date) &&
      (!f.province || r.province === f.province) &&
      (!f.unit || f.unit === 'ALL' || r.unit === f.unit) &&
      (!f.status || r.status === f.status),
  )
  const dates = Array.from(new Set(all.filter((r) => !f.round || r.roundId === Number(f.round)).map((r) => r.date)))
  const provinces = Array.from(new Set(all.map((r) => r.province)))

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold sm:text-2xl">รายละเอียดรายวัน</h1>
        <p className="text-sm text-muted-foreground">แผน 20 วัน (4 รอบ × 5 วัน) แยกตามหน่วยงาน · เลือก "รวมทุกหน่วยงาน" เพื่อดูยอดรวมต่อวัน</p>
      </div>

      <Card className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-3 lg:grid-cols-6">
        <Select value={f.round} onChange={(e) => setF('round', e.target.value)}>
          <option value="">ทุกรอบ</option>
          {data.rounds.map((r) => <option key={r.id} value={r.id}>รอบที่ {r.id}</option>)}
        </Select>
        <Select value={f.date} onChange={(e) => setF('date', e.target.value)}>
          <option value="">ทุกวัน</option>
          {dates.map((d) => <option key={d} value={d}>{thaiDate(d, true)}</option>)}
        </Select>
        <Select value={f.province} onChange={(e) => setF('province', e.target.value)}>
          <option value="">ทุกจังหวัด</option>
          {provinces.map((p) => <option key={p}>{p}</option>)}
        </Select>
        <Select value={f.unit} onChange={(e) => setF('unit', e.target.value)}>
          <option value="">ทุกหน่วยงาน (แยก)</option>
          <option value="ALL">รวมทุกหน่วยงาน</option>
          {UNITS.map((u) => <option key={u.code} value={u.code}>{u.short}</option>)}
        </Select>
        <Select value={f.status} onChange={(e) => setF('status', e.target.value)}>
          <option value="">ทุกสถานะ</option>
          {(Object.keys(STATUS) as ReadinessStatus[]).map((k) => <option key={k} value={k}>{STATUS[k].label}</option>)}
        </Select>
        <Button variant="ghost" onClick={() => setParams({}, { replace: true })}><FilterX /> ล้างตัวกรอง</Button>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <DayTable rows={rows} onOpen={(r) => r.unit !== 'ALL' && setOpen({ round: r.roundId, unit: r.unit })} />
        </div>
        <div className="border-t border-border px-4 py-2 text-xs text-muted-foreground">{rows.length} แถว · "–" = ยังไม่ตอบ</div>
      </Card>

      <Dialog open={!!open} onOpenChange={(v) => !v && setOpen(null)}>
        {open && <UnitRoundDialog roundId={open.round} unit={open.unit} />}
      </Dialog>
    </div>
  )
}

export function DayTable({ rows, onOpen }: { rows: DayRow[]; onOpen?: (r: DayRow) => void }) {
  const cell = (r: DayRow, k: Resource) => {
    const plan = r.plan[k]
    const ready = r.ready[k]
    if (plan === 0 && !ready) return { plan: '–', ready: '–', cls: 'text-muted-foreground' }
    return {
      plan: String(plan),
      ready: ready === null ? '–' : String(ready),
      cls: ready === null ? 'text-muted-foreground' : ready < plan ? 'text-notready font-semibold' : 'text-ready font-semibold',
    }
  }
  return (
    <table className="data-table">
      <thead>
        <tr>
          <th>วันที่</th>
          <th>รอบ</th>
          <th>จังหวัด</th>
          <th>หน่วยงาน</th>
          <th className="text-center">เจ้าหน้าที่<br />แผน</th>
          <th className="text-center">เจ้าหน้าที่<br />พร้อม</th>
          <th className="text-center">รถเครน<br />แผน</th>
          <th className="text-center">รถเครน<br />พร้อม</th>
          <th className="text-center">รถกระบะ<br />แผน</th>
          <th className="text-center">รถกระบะ<br />พร้อม</th>
          <th>สถานะ</th>
          <th className="min-w-48">หมายเหตุ</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => {
          const prev = rows[i - 1]
          const newDay = !prev || prev.date !== r.date
          return (
            <tr key={`${r.date}-${r.unit}`} onClick={() => onOpen?.(r)} className={cn(onOpen && r.unit !== 'ALL' && 'cursor-pointer', newDay && i > 0 && '[&>td]:border-t-2 [&>td]:border-t-input')}>
              <td className="whitespace-nowrap">{newDay ? thaiDate(r.date, true, true) : ''}</td>
              <td className="text-center">{r.roundId}</td>
              <td className="whitespace-nowrap">{r.province}</td>
              <td className="whitespace-nowrap font-medium">{r.unit === 'ALL' ? 'รวมทุกหน่วยงาน' : unitByCode(r.unit).short}</td>
              {(['staff', 'crane', 'pickup'] as const).map((k) => {
                const c = cell(r, k)
                return (
                  <React.Fragment key={k}>
                    <td className="text-center tabular">{c.plan}</td>
                    <td className={cn('text-center tabular', c.cls)}>{c.ready}</td>
                  </React.Fragment>
                )
              })}
              <td><StatusBadge status={r.status} /></td>
              <td className="text-xs text-muted-foreground">{r.note}</td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
