export type UnitCode = 'SURAT' | 'SONGKHLA' | 'KRABI' | 'YALA'
export type Resource = 'staff' | 'crane' | 'pickup'
export type Role = 'admin' | 'unit_officer' | 'executive'

export interface Unit {
  code: UnitCode
  name: string // ชื่อเต็ม
  short: string // ชื่อย่อแสดงผล
  abbr: string // อักษรย่อในเอกสารแผน
}

export interface PlanDay {
  date: string // ISO yyyy-mm-dd (ค.ศ.)
  province: string
  note?: string // หมายเหตุจากเอกสารต้นฉบับ
}

export type Allocation = Record<UnitCode, Record<Resource, number>>

export interface Round {
  id: number
  month: string
  target: string // โครงการ/เป้าหมาย ตามเอกสาร
  commodity: string
  days: PlanDay[]
  /** จำนวนรวมที่ระบุในหัวตารางของเอกสารต้นฉบับ (null = ไม่มีคอลัมน์นี้ในเอกสาร) */
  headerTotals: Record<Resource, number | null>
  /** จำนวนรายหน่วยงานต่อวัน ตามรายละเอียดในตาราง */
  allocations: Allocation
}

export interface PlanIssue {
  id: string
  roundId: number
  resource?: Resource
  title: string
  detail: string
  /** ค่าตามต้นฉบับที่ขัดแย้งกัน เก็บไว้ทั้งหมด ห้ามปรับเอง */
  sourceValues?: { label: string; value: string }[]
  /** true = กระทบการตัดสินใจ ห้ามแสดงสีเขียวจนกว่าจะยืนยัน */
  blocking: boolean
  status: 'open' | 'resolved'
  resolution?: string
  resolvedBy?: string
  resolvedAt?: string
}

export interface DayReadiness {
  date: string
  available: boolean // พร้อมเข้าร่วมวันนี้หรือไม่
  staff: number | null
  crane: number | null
  pickup: number | null
}

export interface UnitResponse {
  roundId: number
  unit: UnitCode
  status: 'draft' | 'submitted'
  cannotParticipate: boolean
  coordinatorName: string
  coordinatorPhone: string
  notes: string
  problems: string
  constraintUnresolved: boolean
  needsSupport: boolean
  supportStaff: number
  supportCrane: number
  supportPickup: number
  supportDetail: string
  days: DayReadiness[]
  updatedAt: string
  updatedBy: string
  submittedAt?: string
}

export interface HistoryEntry {
  id: string
  roundId: number
  unit: UnitCode
  action: 'draft' | 'submit'
  at: string
  by: string
  snapshot: UnitResponse
}

export interface MeetingDecision {
  id: string
  roundId: number
  topic: string
  decision: string
  allocation: string
  owner: string
  dueDate: string
  createdAt: string
  createdBy: string
}

export interface AppUser {
  id: string
  displayName: string
  role: Role
  unit: UnitCode | null
  email?: string
}

export type ReadinessStatus = 'ready' | 'partial' | 'not_ready' | 'no_response' | 'plan_pending'
