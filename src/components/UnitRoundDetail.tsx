import { Link } from 'react-router-dom'
import { Pencil, Phone, User } from 'lucide-react'
import { useApp } from '@/lib/app-context'
import { RESOURCES, unitByCode } from '@/data/plan'
import { planFor, thaiDate, thaiDateTime, unitDayChecks } from '@/lib/readiness'
import { StatusBadge } from '@/lib/status-ui'
import { canEditUnit } from '@/lib/repo'
import { Button } from '@/components/ui/button'
import { DialogContent } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import type { Round, UnitCode } from '@/lib/types'

export function UnitRoundDialog({ roundId, unit }: { roundId: number; unit: UnitCode }) {
  const { summaries, user } = useApp()
  const s = summaries.find((x) => x.round.id === roundId)
  if (!s) return null
  const u = s.units.find((x) => x.unit === unit)
  const round: Round = s.round
  const resp = u?.resp
  const checks = unitDayChecks(round, unit, resp)
  const res = RESOURCES.filter((r) => planFor(round, unit, r.key) > 0)

  return (
    <DialogContent
      title={`${unitByCode(unit).name} · รอบที่ ${roundId}`}
      description={`${s.round.commodity} · ${s.round.days.length} วัน`}
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          {u && <StatusBadge status={u.result.status} className="text-sm" />}
          {resp?.status === 'draft' && <span className="text-xs text-muted-foreground">(มีฉบับร่าง)</span>}
          {resp?.submittedAt && <span className="text-xs text-muted-foreground">ส่งยืนยันล่าสุด {thaiDateTime(resp.submittedAt)}</span>}
        </div>
        {u && (
          <ul className="list-disc space-y-0.5 pl-5 text-sm text-muted-foreground">
            {u.result.reasons.map((r) => <li key={r}>{r}</li>)}
          </ul>
        )}

        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="data-table">
            <thead>
              <tr>
                <th>วันที่</th>
                <th>จังหวัด</th>
                {res.map((r) => <th key={r.key} className="text-center">{r.label}<br /><span className="font-normal">พร้อม/แผน</span></th>)}
              </tr>
            </thead>
            <tbody>
              {checks.map((c, i) => (
                <tr key={c.date}>
                  <td className="whitespace-nowrap">{thaiDate(c.date, true, true)}</td>
                  <td className="whitespace-nowrap">{round.days[i].province}</td>
                  {res.map((r) => {
                    const it = c.items.find((x) => x.r === r.key)!
                    const answered = resp?.status === 'submitted'
                    return (
                      <td key={r.key} className={cn('text-center tabular font-semibold', answered && (it.short ? 'text-notready' : 'text-ready'))}>
                        {answered ? (c.available ? `${it.ready}/${it.plan}` : <span className="text-xs font-normal text-notready">ไม่พร้อมวันนี้</span>) : <span className="font-normal text-muted-foreground">–/{it.plan}</span>}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {resp && (
          <div className="grid gap-3 text-sm sm:grid-cols-2">
            <div className="flex items-center gap-2"><User className="size-4 text-muted-foreground" />{resp.coordinatorName || '-'}</div>
            <div className="flex items-center gap-2"><Phone className="size-4 text-muted-foreground" />{resp.coordinatorPhone || '-'}</div>
            {resp.problems && <Field label="ปัญหาและข้อจำกัด" value={resp.problems} />}
            {resp.notes && <Field label="หมายเหตุ" value={resp.notes} />}
            {resp.needsSupport && (
              <Field
                label="ขอรับการสนับสนุน"
                value={[
                  resp.supportStaff ? `เจ้าหน้าที่ ${resp.supportStaff} คน` : '',
                  resp.supportCrane ? `รถเครน ${resp.supportCrane} คัน` : '',
                  resp.supportPickup ? `รถกระบะ ${resp.supportPickup} คัน` : '',
                  resp.supportDetail,
                ].filter(Boolean).join(' · ')}
              />
            )}
          </div>
        )}

        {canEditUnit(user, unit) && (
          <Button asChild variant="outline">
            <Link to={`/survey?round=${roundId}&unit=${unit}`}><Pencil /> กรอก/แก้ไขข้อมูลหน่วยงานนี้</Link>
          </Button>
        )}
      </div>
    </DialogContent>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="sm:col-span-2">
      <div className="text-xs font-semibold text-muted-foreground">{label}</div>
      <div className="whitespace-pre-wrap">{value}</div>
    </div>
  )
}
