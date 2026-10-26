import type {
  DayReadiness, PlanIssue, ReadinessStatus, Resource, Round, UnitCode, UnitResponse,
} from './types'
import { UNIT_CODES } from '@/data/plan'

export const RES_KEYS: Resource[] = ['staff', 'crane', 'pickup']

/** จำนวนที่พร้อมจริงของวันหนึ่ง (ถ้าไม่พร้อมเข้าร่วมวันนั้น = 0) */
export function effective(day: DayReadiness | undefined, r: Resource): number {
  if (!day || !day.available) return 0
  return Math.max(0, day[r] ?? 0)
}

export function planFor(round: Round, unit: UnitCode, r: Resource): number {
  return round.allocations[unit]?.[r] ?? 0
}

export function unitParticipates(round: Round, unit: UnitCode): boolean {
  return RES_KEYS.some((r) => planFor(round, unit, r) > 0)
}

export function participatingUnits(round: Round): UnitCode[] {
  return UNIT_CODES.filter((u) => unitParticipates(round, u))
}

export function isSubmitted(resp?: UnitResponse | null): resp is UnitResponse {
  return !!resp && resp.status === 'submitted'
}

/** ข้อขัดแย้งของแผนที่ยังเปิดอยู่และกระทบการตัดสินใจของหน่วยงานนี้ */
export function blockingIssuesFor(round: Round, unit: UnitCode, issues: PlanIssue[]): PlanIssue[] {
  return issues.filter(
    (i) =>
      i.roundId === round.id &&
      i.status === 'open' &&
      i.blocking &&
      (!i.resource || planFor(round, unit, i.resource) > 0),
  )
}

export interface UnitDayCheck {
  date: string
  available: boolean
  items: { r: Resource; plan: number; ready: number; short: number }[]
  ok: boolean
}

export function unitDayChecks(round: Round, unit: UnitCode, resp?: UnitResponse | null): UnitDayCheck[] {
  return round.days.map((d) => {
    const day = resp?.days.find((x) => x.date === d.date)
    const items = RES_KEYS.map((r) => {
      const plan = planFor(round, unit, r)
      const ready = isSubmitted(resp) ? effective(day, r) : 0
      return { r, plan, ready, short: Math.max(0, plan - ready) }
    })
    return { date: d.date, available: !!day?.available, items, ok: items.every((i) => i.short === 0) }
  })
}

export interface UnitStatusResult {
  status: ReadinessStatus
  reasons: string[]
}

/**
 * กฎสถานะสี (ข้อ 5 ของข้อกำหนด)
 * - เทา  : ยังไม่ได้ "ส่งยืนยัน" (ฉบับร่างไม่นับ)
 * - แดง  : ยืนยันว่าเข้าร่วมไม่ได้ หรือไม่มีเจ้าหน้าที่พร้อมเลยทุกวัน (ภารกิจทำไม่ได้)
 * - เหลือง: ส่งแล้วแต่ทรัพยากรบางรายการ/บางวันไม่ครบ หรือยังมีข้อจำกัดสำคัญค้าง
 * - แผนรอยืนยัน: พร้อมครบ แต่แผนของรอบนั้นยังมีข้อขัดแย้งที่กระทบการตัดสินใจ (ห้ามเขียว)
 * - เขียว: ส่งแล้ว ครบตามแผนทุกวัน ไม่มีข้อจำกัดค้าง และแผนไม่มีข้อขัดแย้ง
 */
export function unitStatus(
  round: Round, unit: UnitCode, resp: UnitResponse | null | undefined, issues: PlanIssue[],
): UnitStatusResult {
  if (!isSubmitted(resp)) {
    return { status: 'no_response', reasons: [resp ? 'มีฉบับร่าง ยังไม่ส่งยืนยัน' : 'ยังไม่ได้ส่งข้อมูล'] }
  }
  if (resp.cannotParticipate) {
    return { status: 'not_ready', reasons: ['หน่วยงานยืนยันว่าไม่สามารถเข้าร่วมปฏิบัติงานได้'] }
  }
  const checks = unitDayChecks(round, unit, resp)
  const planStaff = planFor(round, unit, 'staff')
  const totalStaff = checks.reduce((s, c) => s + c.items.find((i) => i.r === 'staff')!.ready, 0)
  const totalAll = checks.reduce((s, c) => s + c.items.reduce((a, i) => a + i.ready, 0), 0)
  if ((planStaff > 0 && totalStaff === 0) || totalAll === 0) {
    return { status: 'not_ready', reasons: ['ไม่มีเจ้าหน้าที่พร้อมปฏิบัติงานในวันใดเลย'] }
  }

  const reasons: string[] = []
  const daysMissing = checks.filter((c) => !c.available).length
  if (daysMissing > 0) reasons.push(`ไม่พร้อม ${daysMissing} จาก ${checks.length} วัน`)
  for (const r of RES_KEYS) {
    const shortDays = checks.filter((c) => c.available && c.items.find((i) => i.r === r)!.short > 0)
    if (shortDays.length > 0) reasons.push(`${labelOf(r)}ไม่ครบ ${shortDays.length} วัน`)
  }
  if (resp.constraintUnresolved) reasons.push('มีข้อจำกัดสำคัญที่ยังไม่ได้แก้ไข')
  if (reasons.length > 0) return { status: 'partial', reasons }

  const blocking = blockingIssuesFor(round, unit, issues)
  if (blocking.length > 0) {
    return { status: 'plan_pending', reasons: ['พร้อมครบตามรายละเอียดแผน แต่แผนยังรอยืนยัน', ...blocking.map((b) => b.title)] }
  }
  return { status: 'ready', reasons: ['พร้อมครบตามแผนทุกวัน'] }
}

const labelOf = (r: Resource) => ({ staff: 'เจ้าหน้าที่', crane: 'รถเครน', pickup: 'รถกระบะ' })[r]

export interface ResourceSummary {
  r: Resource
  planPerDay: number
  headerTotal: number | null
  conflict: boolean // หัวตารางไม่ตรงกับผลรวมรายหน่วยงาน
  readyByDay: number[] // รวมทุกหน่วยงานที่ส่งยืนยันแล้ว รายวัน
  minReady: number // จำนวนที่พร้อมได้ "ทุกวัน" (วันต่ำสุด) – ไม่นับซ้ำข้ามวัน
  maxShort: number // ขาดสูงสุดในวันใดวันหนึ่ง
  planUnitDays: number
  readyUnitDays: number // ผลรวม min(พร้อม, แผน) รายวัน
  shortUnitDays: number
  pct: number // ร้อยละความพร้อม (นับตามวัน)
}

/**
 * การรวมนับ "รายวัน": แต่ละวันรวมจำนวนพร้อมของทุกหน่วยงาน แล้วเทียบกับแผนของวันนั้น
 * ตัวเลขหลักที่แสดงคือ "พร้อมได้ทุกวัน" = ค่าต่ำสุดรายวัน จึงไม่นับรถ/คนเดิมซ้ำ 5 วันเป็น 5 ชุด
 * ร้อยละ = Σ min(พร้อม, แผน) ÷ Σ แผน ของทุกวัน
 */
export function resourceSummary(
  round: Round, responses: UnitResponse[], r: Resource,
): ResourceSummary {
  const units = UNIT_CODES
  const planPerDay = units.reduce((s, u) => s + planFor(round, u, r), 0)
  const readyByDay = round.days.map((d) =>
    units.reduce((s, u) => {
      const resp = responses.find((x) => x.roundId === round.id && x.unit === u)
      if (!isSubmitted(resp) || resp.cannotParticipate) return s
      return s + effective(resp.days.find((x) => x.date === d.date), r)
    }, 0),
  )
  const minReady = readyByDay.length ? Math.min(...readyByDay) : 0
  const maxShort = Math.max(0, ...readyByDay.map((x) => planPerDay - x))
  const planUnitDays = planPerDay * round.days.length
  const readyUnitDays = readyByDay.reduce((s, x) => s + Math.min(x, planPerDay), 0)
  const headerTotal = round.headerTotals[r]
  return {
    r,
    planPerDay,
    headerTotal,
    conflict: headerTotal !== null && headerTotal !== planPerDay,
    readyByDay,
    minReady,
    maxShort,
    planUnitDays,
    readyUnitDays,
    shortUnitDays: planUnitDays - readyUnitDays,
    pct: planUnitDays === 0 ? 100 : Math.round((readyUnitDays / planUnitDays) * 1000) / 10,
  }
}

export interface RoundSummary {
  round: Round
  units: { unit: UnitCode; result: UnitStatusResult; resp?: UnitResponse }[]
  resources: ResourceSummary[]
  answered: number
  total: number
  unanswered: UnitCode[]
  overall: ReadinessStatus
  openIssues: PlanIssue[]
}

export function roundSummary(round: Round, responses: UnitResponse[], issues: PlanIssue[]): RoundSummary {
  const parts = participatingUnits(round)
  const units = parts.map((u) => {
    const resp = responses.find((x) => x.roundId === round.id && x.unit === u)
    return { unit: u, resp, result: unitStatus(round, u, resp, issues) }
  })
  const answered = units.filter((x) => isSubmitted(x.resp)).length
  const st = units.map((x) => x.result.status)
  const openIssues = issues.filter((i) => i.roundId === round.id && i.status === 'open')
  let overall: ReadinessStatus
  if (answered === 0) overall = 'no_response'
  else if (st.includes('not_ready')) overall = 'not_ready'
  else if (st.includes('partial')) overall = 'partial'
  else if (st.includes('no_response')) overall = 'no_response'
  else if (st.includes('plan_pending') || openIssues.some((i) => i.blocking)) overall = 'plan_pending'
  else overall = 'ready'
  return {
    round,
    units,
    resources: RES_KEYS.map((r) => resourceSummary(round, responses, r)),
    answered,
    total: parts.length,
    unanswered: units.filter((x) => !isSubmitted(x.resp)).map((x) => x.unit),
    overall,
    openIssues,
  }
}

/** สร้างแบบฟอร์มเปล่า: ยังไม่ตอบ = ค่า null (ไม่ใช่ 0) */
export function blankResponse(round: Round, unit: UnitCode, by: string): UnitResponse {
  return {
    roundId: round.id,
    unit,
    status: 'draft',
    cannotParticipate: false,
    coordinatorName: '',
    coordinatorPhone: '',
    notes: '',
    problems: '',
    constraintUnresolved: false,
    needsSupport: false,
    supportStaff: 0,
    supportCrane: 0,
    supportPickup: 0,
    supportDetail: '',
    days: round.days.map((d) => ({ date: d.date, available: true, staff: null, crane: null, pickup: null })),
    updatedAt: new Date().toISOString(),
    updatedBy: by,
  }
}

/** ตรวจความครบถ้วนก่อน "ส่งยืนยัน" */
export function validateForSubmit(round: Round, resp: UnitResponse): string[] {
  const errs: string[] = []
  if (!resp.coordinatorName.trim()) errs.push('กรุณาระบุชื่อผู้ประสานงาน')
  if (resp.cannotParticipate) {
    if (!resp.problems.trim()) errs.push('กรุณาระบุเหตุผล/ข้อจำกัดที่ไม่สามารถเข้าร่วมได้')
    return errs
  }
  for (const d of resp.days) {
    if (!d.available) continue
    for (const r of RES_KEYS) {
      if (planFor(round, resp.unit, r) > 0 && (d[r] === null || d[r] === undefined)) {
        errs.push(`กรอกจำนวน${labelOf(r)}ให้ครบทุกวันที่พร้อม (ยังขาดวันที่ ${thaiDate(d.date, true)})`)
        break
      }
    }
  }
  if (resp.needsSupport && resp.supportStaff + resp.supportCrane + resp.supportPickup === 0 && !resp.supportDetail.trim()) {
    errs.push('ระบุจำนวนหรือรายละเอียดทรัพยากรที่ต้องการสนับสนุน')
  }
  return Array.from(new Set(errs))
}

// ---------- รูปแบบวันที่ภาษาไทย ----------
const TH_MONTH_SHORT = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']
const TH_MONTH = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม']
const TH_DOW = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.']

export function thaiDate(iso: string, short = false, withDow = false): string {
  const [y, m, d] = iso.split('-').map(Number)
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay()
  const base = short ? `${d} ${TH_MONTH_SHORT[m - 1]} ${String(y + 543).slice(2)}` : `${d} ${TH_MONTH[m - 1]} ${y + 543}`
  return withDow ? `${TH_DOW[dow]} ${base}` : base
}

export function roundDateRange(round: Round): string {
  const f = round.days[0].date
  const l = round.days[round.days.length - 1].date
  const [y, m, d1] = f.split('-').map(Number)
  const d2 = Number(l.split('-')[2])
  return `${d1}–${d2} ${TH_MONTH[m - 1]} ${y + 543}`
}

export function roundProvinces(round: Round): string[] {
  return Array.from(new Set(round.days.map((d) => d.province)))
}

export function thaiDateTime(iso?: string): string {
  if (!iso) return '-'
  return new Date(iso).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' })
}
