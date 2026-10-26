import type { Round, UnitCode, UnitResponse } from '@/lib/types'
import { blankResponse, planFor } from '@/lib/readiness'

/** ข้อมูลทดสอบตามข้อ 13 ของข้อกำหนด – ใช้ทั้งใน unit test และปุ่ม "โหลดข้อมูลทดสอบ" ในโหมดสาธิต */
function full(round: Round, unit: UnitCode, by: string): UnitResponse {
  const r = blankResponse(round, unit, by)
  r.days = r.days.map((d) => ({
    ...d,
    staff: planFor(round, unit, 'staff'),
    crane: planFor(round, unit, 'crane'),
    pickup: planFor(round, unit, 'pickup'),
  }))
  r.status = 'submitted'
  r.submittedAt = new Date().toISOString()
  return r
}

export function testScenarios(rounds: Round[]): UnitResponse[] {
  const [r1, r2, , r4] = rounds
  const by = 'ข้อมูลทดสอบ'

  // 1) สงขลายืนยันพร้อมครบทุกอย่าง → เขียว
  const songkhla = full(r1, 'SONGKHLA', by)
  songkhla.coordinatorName = 'ผู้ประสานงาน สข (ทดสอบ)'

  // 2) กระบี่พร้อมเจ้าหน้าที่ แต่รถไม่พร้อม → เหลือง
  const krabi = full(r1, 'KRABI', by)
  krabi.coordinatorName = 'ผู้ประสานงาน กบ (ทดสอบ)'
  krabi.days = krabi.days.map((d) => ({ ...d, pickup: 0 }))
  krabi.problems = 'รถกระบะเข้าศูนย์ซ่อม'
  krabi.needsSupport = true
  krabi.supportPickup = 1

  // 3) ยะลายืนยันไม่สามารถเข้าร่วม → แดง
  const yala = full(r1, 'YALA', by)
  yala.coordinatorName = 'ผู้ประสานงาน ยล (ทดสอบ)'
  yala.cannotParticipate = true
  yala.problems = 'ติดภารกิจตรวจสอบในพื้นที่ช่วงเดียวกัน'

  // 4) สุราษฎร์ธานียังไม่ตอบ → เทา (ไม่สร้างข้อมูล)

  // 5) หน่วยงานพร้อมบางวัน (รอบ 2 สงขลา พร้อมวันที่ 15–17 เท่านั้น, วันที่ 16 คนเหลือ 1)
  const partialDays = full(r2, 'SONGKHLA', by)
  partialDays.coordinatorName = 'ผู้ประสานงาน สข (ทดสอบ)'
  partialDays.days = partialDays.days.map((d, i) =>
    i >= 3 ? { ...d, available: false, staff: null, crane: null, pickup: null } : i === 1 ? { ...d, staff: 1 } : d,
  )

  // 9) รอบ 4 สงขลาพร้อมครบ → ต้องไม่เขียว แต่เป็น "แผนรอยืนยัน" (รถกระบะ 2 vs 4)
  const r4full = full(r4, 'SONGKHLA', by)
  r4full.coordinatorName = 'ผู้ประสานงาน สข (ทดสอบ)'

  // ฉบับร่าง (ไม่ถือเป็นการยืนยัน) – สุราษฎร์ธานีรอบ 2
  const draft = full(r2, 'SURAT', by)
  draft.status = 'draft'
  delete draft.submittedAt

  return [songkhla, krabi, yala, partialDays, r4full, draft]
}
