import { beforeEach, describe, expect, it } from 'vitest'
import { SEED_ISSUES, SEED_ROUNDS } from '@/data/plan'
import { testScenarios } from '@/data/scenarios'
import {
  blankResponse, resourceSummary, roundSummary, unitDayChecks, unitStatus, validateForSubmit,
} from './readiness'
import { canEditUnit } from './repo'
import type { UnitResponse } from './types'

const rounds = SEED_ROUNDS
const issues = SEED_ISSUES
const scen = testScenarios(rounds)
const find = (round: number, unit: string, status: UnitResponse['status'] = 'submitted') =>
  scen.find((r) => r.roundId === round && r.unit === unit && r.status === status)

describe('ข้อมูลแผน', () => {
  it('มี 4 รอบ × 5 วัน = 20 วัน', () => {
    expect(rounds.flatMap((r) => r.days)).toHaveLength(20)
  })
  it('รอบ 1–3 ต่อวัน: เครน 2 / กระบะ 4 / เจ้าหน้าที่ 6 ตรงกับหัวตาราง', () => {
    for (const r of rounds.slice(0, 3)) {
      for (const k of ['crane', 'pickup', 'staff'] as const) {
        const s = resourceSummary(r, [], k)
        expect(s.planPerDay).toBe(r.headerTotals[k])
        expect(s.conflict).toBe(false)
      }
    }
  })
})

describe('กรณีทดสอบตามข้อ 13', () => {
  const r1 = rounds[0]
  it('1) สงขลาพร้อมครบ → เขียว', () => {
    expect(unitStatus(r1, 'SONGKHLA', find(1, 'SONGKHLA'), issues).status).toBe('ready')
  })
  it('2) กระบี่พร้อมเจ้าหน้าที่แต่รถไม่พร้อม → เหลือง', () => {
    const res = unitStatus(r1, 'KRABI', find(1, 'KRABI'), issues)
    expect(res.status).toBe('partial')
    expect(res.reasons.join()).toContain('รถกระบะ')
  })
  it('3) ยะลายืนยันไม่สามารถเข้าร่วม → แดง', () => {
    expect(unitStatus(r1, 'YALA', find(1, 'YALA'), issues).status).toBe('not_ready')
  })
  it('4) สุราษฎร์ธานียังไม่ตอบ → เทา', () => {
    expect(unitStatus(r1, 'SURAT', undefined, issues).status).toBe('no_response')
  })
  it('ฉบับร่างไม่ถือเป็นการยืนยัน → เทา', () => {
    const draft = find(2, 'SURAT', 'draft')
    expect(draft).toBeDefined()
    expect(unitStatus(rounds[1], 'SURAT', draft, issues).status).toBe('no_response')
  })
  it('5) พร้อมบางวัน → แสดงแยกวันถูกต้อง และเป็นเหลือง', () => {
    const resp = find(2, 'SONGKHLA')!
    const checks = unitDayChecks(rounds[1], 'SONGKHLA', resp)
    expect(checks.map((c) => c.ok)).toEqual([true, false, true, false, false])
    expect(checks[1].items.find((i) => i.r === 'staff')!.ready).toBe(1)
    expect(checks[3].available).toBe(false)
    expect(unitStatus(rounds[1], 'SONGKHLA', resp, issues).status).toBe('partial')
  })
  it('8) คำนวณจำนวนขาดถูกต้อง (รอบ 1: เครน 1/2 ขาด 1 = 50%)', () => {
    const sum = roundSummary(r1, scen, issues)
    const crane = sum.resources.find((x) => x.r === 'crane')!
    expect(crane.planPerDay).toBe(2)
    expect(crane.minReady).toBe(1) // สงขลาส่ง 1, สุราษฎร์ยังไม่ตอบ
    expect(crane.maxShort).toBe(1)
    expect(crane.pct).toBe(50)
    const pickup = sum.resources.find((x) => x.r === 'pickup')!
    // สงขลา 1 + กระบี่ 0 + ยะลา (เข้าร่วมไม่ได้) 0 = 1 จาก 4
    expect(pickup.minReady).toBe(1)
    expect(pickup.maxShort).toBe(3)
    expect(pickup.pct).toBe(25)
    const staff = sum.resources.find((x) => x.r === 'staff')!
    // สงขลา 2 + กระบี่ 1 = 3 จาก 6 ต่อวัน (ไม่นับซ้ำ 5 วันเป็น 15 คน)
    expect(staff.minReady).toBe(3)
    expect(staff.pct).toBe(50)
    expect(sum.answered).toBe(3)
    expect(sum.unanswered).toEqual(['SURAT'])
    expect(sum.overall).toBe('not_ready')
  })
  it('9) รอบ 4 รถกระบะ 2 vs 4 → แสดงความขัดแย้ง และไม่ให้เขียว', () => {
    const r4 = rounds[3]
    const p = resourceSummary(r4, scen, 'pickup')
    expect(p.headerTotal).toBe(2)
    expect(p.planPerDay).toBe(4)
    expect(p.conflict).toBe(true)
    expect(unitStatus(r4, 'SONGKHLA', find(4, 'SONGKHLA'), issues).status).toBe('plan_pending')
    const resolved = issues.map((i) => (i.id === 'R4-PICKUP' ? { ...i, status: 'resolved' as const } : i))
    expect(unitStatus(r4, 'SONGKHLA', find(4, 'SONGKHLA'), resolved).status).toBe('ready')
  })
  it('7) ผู้ใช้แก้ไขข้อมูลหน่วยงานอื่นไม่ได้', () => {
    const officer = { id: 'x', displayName: 'x', role: 'unit_officer' as const, unit: 'KRABI' as const }
    expect(canEditUnit(officer, 'KRABI')).toBe(true)
    expect(canEditUnit(officer, 'YALA')).toBe(false)
    expect(canEditUnit({ ...officer, role: 'executive', unit: null }, 'KRABI')).toBe(false)
    expect(canEditUnit({ ...officer, role: 'admin' }, 'YALA')).toBe(true)
  })
})

describe('แบบฟอร์ม', () => {
  it('แบบฟอร์มใหม่เริ่มเป็น "ยังไม่ตอบ" (null) ไม่ใช่ 0', () => {
    const b = blankResponse(rounds[0], 'SURAT', 't')
    expect(b.days.every((d) => d.staff === null && d.crane === null && d.pickup === null)).toBe(true)
  })
  it('ส่งยืนยันไม่ได้ถ้ายังกรอกไม่ครบ', () => {
    const b = blankResponse(rounds[0], 'SURAT', 't')
    expect(validateForSubmit(rounds[0], b).length).toBeGreaterThan(0)
  })
})

describe('6) Refresh แล้วข้อมูลยังอยู่ (โหมดสาธิต)', () => {
  beforeEach(() => {
    const store = new Map<string, string>()
    ;(globalThis as any).localStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    }
    ;(globalThis as any).window = { dispatchEvent: () => true, addEventListener() {}, removeEventListener() {} }
  })
  it('บันทึกแล้วโหลดใหม่ได้ค่าเดิม และหน่วยงานอื่นบันทึกแทนไม่ได้', async () => {
    const { demoRepo } = await import('./repo-demo')
    const user = { id: 'k', displayName: 'กบ', role: 'unit_officer' as const, unit: 'KRABI' as const }
    const resp = { ...find(1, 'KRABI')! }
    await demoRepo.saveResponse(resp, 'submit', user)
    const again = await demoRepo.loadAll() // จำลองการ refresh: อ่านจาก storage ใหม่
    expect(again.responses.find((r) => r.unit === 'KRABI')?.status).toBe('submitted')
    await expect(demoRepo.saveResponse({ ...resp, unit: 'YALA' }, 'submit', user)).rejects.toThrow()
    expect((await demoRepo.history(1, 'KRABI')).length).toBe(1)
  })
})
