import type { AppData } from './repo'
import type { ReadinessStatus, Resource, UnitCode } from './types'
import { blockingIssuesFor, effective, isSubmitted, participatingUnits, planFor, RES_KEYS } from './readiness'

export interface DayRow {
  date: string
  roundId: number
  province: string
  unit: UnitCode | 'ALL'
  plan: Record<Resource, number>
  ready: Record<Resource, number | null> // null = ยังไม่ตอบ
  status: ReadinessStatus
  note: string
}

const zero = (): Record<Resource, number> => ({ staff: 0, crane: 0, pickup: 0 })

/** ตารางแผน 20 วัน × หน่วยงาน พร้อมสถานะรายวัน */
export function dayRows(data: AppData): DayRow[] {
  const rows: DayRow[] = []
  for (const round of data.rounds) {
    for (const d of round.days) {
      for (const unit of participatingUnits(round)) {
        const resp = data.responses.find((x) => x.roundId === round.id && x.unit === unit)
        const plan = zero()
        for (const r of RES_KEYS) plan[r] = planFor(round, unit, r)
        const day = resp?.days.find((x) => x.date === d.date)
        const sub = isSubmitted(resp)
        const ready = {} as Record<Resource, number | null>
        for (const r of RES_KEYS) ready[r] = sub ? (resp.cannotParticipate ? 0 : effective(day, r)) : null
        let status: ReadinessStatus
        const notes: string[] = []
        if (d.note) notes.push(d.note)
        if (!sub) status = 'no_response'
        else if (resp.cannotParticipate) { status = 'not_ready'; notes.push('ไม่สามารถเข้าร่วมได้') }
        else if (!day?.available) { status = 'not_ready'; notes.push('ไม่พร้อมวันนี้') }
        else if (RES_KEYS.some((r) => (ready[r] ?? 0) < plan[r])) status = 'partial'
        else if (blockingIssuesFor(round, unit, data.issues).length) status = 'plan_pending'
        else status = 'ready'
        if (sub && resp.problems) notes.push(resp.problems)
        rows.push({ date: d.date, roundId: round.id, province: d.province, unit, plan, ready, status, note: notes.join(' · ') })
      }
    }
  }
  return rows
}

/** รวมรายวันทุกหน่วยงาน (นับตามวัน ไม่นับซ้ำข้ามวัน) */
export function dayTotals(rows: DayRow[]): DayRow[] {
  const map = new Map<string, DayRow>()
  for (const r of rows) {
    const k = `${r.roundId}|${r.date}`
    const t = map.get(k) ?? {
      date: r.date, roundId: r.roundId, province: r.province, unit: 'ALL' as const, plan: zero(),
      ready: zero() as Record<Resource, number | null>, status: 'ready' as ReadinessStatus, note: '',
    }
    for (const res of RES_KEYS) {
      t.plan[res] += r.plan[res]
      t.ready[res] = (t.ready[res] ?? 0) + (r.ready[res] ?? 0)
    }
    map.set(k, t)
  }
  const unanswered = (k: string) => rows.filter((r) => `${r.roundId}|${r.date}` === k && r.status === 'no_response').length
  return Array.from(map.entries()).map(([k, t]) => {
    const short = RES_KEYS.some((r) => (t.ready[r] ?? 0) < t.plan[r])
    const u = unanswered(k)
    t.status = short ? (u ? 'no_response' : 'partial') : 'ready'
    t.note = u ? `ยังไม่ตอบ ${u} หน่วยงาน` : ''
    return t
  })
}
