import { SEED_ISSUES, SEED_ROUNDS } from '@/data/plan'
import { testScenarios } from '@/data/scenarios'
import type { AppUser, HistoryEntry, UnitResponse } from './types'
import { assertAdmin, canEditUnit, PermissionError, type AppData, type Repo } from './repo'

/**
 * โหมดสาธิต: ข้อมูลเก็บใน localStorage ของเบราว์เซอร์เครื่องนี้เท่านั้น
 * ไม่ใช่ฐานข้อมูลกลาง – หน้าจอแสดงป้าย "โหมดสาธิต" ตลอดเวลา
 */
const KEY = 'sir-demo-v1'
const USER_KEY = 'sir-demo-user'

interface DemoState extends AppData {
  history: HistoryEntry[]
}

export const DEMO_USERS: AppUser[] = [
  { id: 'demo-admin', displayName: 'ผู้ดูแลระบบ (ศูนย์ฯ สุราษฎร์ธานี)', role: 'admin', unit: 'SURAT' },
  { id: 'demo-surat', displayName: 'เจ้าหน้าที่ ชว.สุราษฎร์ธานี', role: 'unit_officer', unit: 'SURAT' },
  { id: 'demo-songkhla', displayName: 'เจ้าหน้าที่ ชว.สงขลา', role: 'unit_officer', unit: 'SONGKHLA' },
  { id: 'demo-krabi', displayName: 'เจ้าหน้าที่ ชว.กระบี่', role: 'unit_officer', unit: 'KRABI' },
  { id: 'demo-yala', displayName: 'เจ้าหน้าที่ ชว.ยะลา', role: 'unit_officer', unit: 'YALA' },
  { id: 'demo-exec', displayName: 'ผู้บริหาร (ดูอย่างเดียว)', role: 'executive', unit: null },
]

const fresh = (): DemoState => ({
  rounds: structuredClone(SEED_ROUNDS),
  issues: structuredClone(SEED_ISSUES),
  responses: [],
  decisions: [],
  history: [],
})

function read(): DemoState {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw) as DemoState
  } catch { /* ใช้ค่าเริ่มต้น */ }
  return fresh()
}
function write(s: DemoState) {
  localStorage.setItem(KEY, JSON.stringify(s))
  window.dispatchEvent(new Event('sir-demo-change'))
}
const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36)

export function resetDemo(withScenarios: boolean) {
  const s = fresh()
  if (withScenarios) {
    s.responses = testScenarios(s.rounds)
    for (const r of s.responses) {
      s.history.push({
        id: uid(), roundId: r.roundId, unit: r.unit, action: r.status === 'submitted' ? 'submit' : 'draft',
        at: r.updatedAt, by: r.updatedBy, snapshot: structuredClone(r),
      })
    }
  }
  write(s)
}

export function demoSignInAs(user: AppUser) {
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export const demoRepo: Repo = {
  mode: 'demo',
  async currentUser() {
    try {
      const raw = localStorage.getItem(USER_KEY)
      return raw ? (JSON.parse(raw) as AppUser) : null
    } catch { return null }
  },
  async signIn() {
    throw new Error('โหมดสาธิตไม่ใช้รหัสผ่าน')
  },
  async signOut() {
    localStorage.removeItem(USER_KEY)
  },
  async loadAll() {
    const s = read()
    return { rounds: s.rounds, issues: s.issues, responses: s.responses, decisions: s.decisions }
  },
  async saveResponse(resp, action, user) {
    if (!canEditUnit(user, resp.unit)) throw new PermissionError('ไม่มีสิทธิ์แก้ไขข้อมูลของหน่วยงานอื่น')
    const s = read()
    const now = new Date().toISOString()
    const prev = s.responses.find((r) => r.roundId === resp.roundId && r.unit === resp.unit)
    const saved: UnitResponse = {
      ...resp,
      // บันทึกร่างทับข้อมูลที่ส่งแล้ว = ถอนการยืนยันจนกว่าจะส่งใหม่
      status: action === 'submit' ? 'submitted' : 'draft',
      updatedAt: now,
      updatedBy: user.displayName,
      submittedAt: action === 'submit' ? now : prev?.submittedAt,
    }
    s.responses = [...s.responses.filter((r) => r !== prev), saved]
    s.history.push({ id: uid(), roundId: resp.roundId, unit: resp.unit, action, at: now, by: user.displayName, snapshot: structuredClone(saved) })
    write(s)
    return saved
  },
  async history(roundId, unit) {
    return read().history.filter((h) => h.roundId === roundId && h.unit === unit).sort((a, b) => b.at.localeCompare(a.at))
  },
  async addDecision(d, user) {
    assertAdmin(user)
    const s = read()
    s.decisions.push({ ...d, id: uid(), createdAt: new Date().toISOString(), createdBy: user.displayName })
    write(s)
  },
  async deleteDecision(id, user) {
    assertAdmin(user)
    const s = read()
    s.decisions = s.decisions.filter((x) => x.id !== id)
    write(s)
  },
  async updateRoundPlan(round, user) {
    assertAdmin(user)
    const s = read()
    s.rounds = s.rounds.map((r) => (r.id === round.id ? round : r))
    write(s)
  },
  async resolveIssue(id, resolution, reopen, user) {
    assertAdmin(user)
    const s = read()
    s.issues = s.issues.map((i) =>
      i.id === id
        ? reopen
          ? { ...i, status: 'open', resolution: undefined, resolvedAt: undefined, resolvedBy: undefined }
          : { ...i, status: 'resolved', resolution, resolvedAt: new Date().toISOString(), resolvedBy: user.displayName }
        : i,
    )
    write(s)
  },
  subscribe(onChange) {
    const h = (e: Event) => {
      if (e.type === 'storage' && (e as StorageEvent).key !== KEY) return
      onChange()
    }
    window.addEventListener('sir-demo-change', h)
    window.addEventListener('storage', h) // แท็บอื่นในเบราว์เซอร์เดียวกัน
    return () => {
      window.removeEventListener('sir-demo-change', h)
      window.removeEventListener('storage', h)
    }
  },
}
