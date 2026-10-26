import type { Allocation, PlanIssue, Round, Unit, UnitCode, Resource } from '@/lib/types'

/**
 * ข้อมูลแผนเริ่มต้น (Seed) ถอดจากภาพตารางแผน 4 หน้า
 * "โครงการตรวจสอบเครื่องชั่งตวงวัดสินค้าเกษตรแบบบูรณาการเขตภาคใต้ ปีงบประมาณ ๒๕๗๐"
 * วันที่เก็บเป็น ค.ศ. (2570 = 2027) และแสดงผลเป็น พ.ศ.
 * ไฟล์นี้ต้องตรงกับ supabase/migrations/0002_seed_plan.sql
 */

export const UNITS: Unit[] = [
  { code: 'SURAT', name: 'ศูนย์ชั่งตวงวัดภาคใต้ (สุราษฎร์ธานี)', short: 'สุราษฎร์ธานี', abbr: 'สฎ' },
  { code: 'SONGKHLA', name: 'สำนักงานสาขาชั่งตวงวัดสงขลา', short: 'สงขลา', abbr: 'สข' },
  { code: 'KRABI', name: 'สำนักงานสาขาชั่งตวงวัดกระบี่', short: 'กระบี่', abbr: 'กบ' },
  { code: 'YALA', name: 'สำนักงานสาขาชั่งตวงวัดยะลา', short: 'ยะลา', abbr: 'ยล' },
]

export const UNIT_CODES: UnitCode[] = UNITS.map((u) => u.code)
export const unitByCode = (c: UnitCode) => UNITS.find((u) => u.code === c)!

export const RESOURCES: { key: Resource; label: string; unit: string }[] = [
  { key: 'staff', label: 'เจ้าหน้าที่', unit: 'คน' },
  { key: 'crane', label: 'รถเครน', unit: 'คัน' },
  { key: 'pickup', label: 'รถกระบะ', unit: 'คัน' },
]
export const resourceLabel = (r: Resource) => RESOURCES.find((x) => x.key === r)!

const STD: Allocation = {
  SURAT: { staff: 2, crane: 1, pickup: 1 },
  SONGKHLA: { staff: 2, crane: 1, pickup: 1 },
  KRABI: { staff: 1, crane: 0, pickup: 1 },
  YALA: { staff: 1, crane: 0, pickup: 1 },
}
const clone = (a: Allocation): Allocation => JSON.parse(JSON.stringify(a))

export const SEED_ROUNDS: Round[] = [
  {
    id: 1,
    month: 'มกราคม 2570',
    target: 'จุดรับซื้อยางพารา',
    commodity: 'ยางพารา',
    days: [
      { date: '2027-01-11', province: 'พัทลุง' },
      { date: '2027-01-12', province: 'พัทลุง' },
      { date: '2027-01-13', province: 'ตรัง' },
      { date: '2027-01-14', province: 'ตรัง' },
      { date: '2027-01-15', province: 'ตรัง' },
    ],
    headerTotals: { crane: 2, pickup: 4, staff: 6 },
    allocations: clone(STD),
  },
  {
    id: 2,
    month: 'มีนาคม 2570',
    target: 'โรงสีข้าว + ปาล์มน้ำมัน',
    commodity: 'ข้าวและปาล์มน้ำมัน',
    days: [
      { date: '2027-03-15', province: 'นครศรีธรรมราช', note: 'แบ่ง 2 สายแยกเป็น… (ข้อความต้นฉบับไม่ครบ)' },
      { date: '2027-03-16', province: 'นครศรีธรรมราช' },
      { date: '2027-03-17', province: 'สงขลา' },
      { date: '2027-03-18', province: 'พัทลุง' },
      { date: '2027-03-19', province: 'พัทลุง' },
    ],
    headerTotals: { crane: 2, pickup: 4, staff: 6 },
    allocations: clone(STD),
  },
  {
    id: 3,
    month: 'มิถุนายน 2570',
    target: 'ปาล์มน้ำมัน + ยางพารา',
    commodity: 'ปาล์มน้ำมันและยางพารา',
    days: [
      { date: '2027-06-21', province: 'สุราษฎร์ธานี' },
      { date: '2027-06-22', province: 'สุราษฎร์ธานี' },
      { date: '2027-06-23', province: 'สุราษฎร์ธานี' },
      { date: '2027-06-24', province: 'นครศรีธรรมราช' },
      { date: '2027-06-25', province: 'นครศรีธรรมราช' },
    ],
    headerTotals: { crane: 2, pickup: 4, staff: 6 },
    allocations: clone(STD),
  },
  {
    id: 4,
    month: 'สิงหาคม 2570',
    target: 'มังคุด + ทุเรียน + ยางพารา',
    commodity: 'มังคุด ทุเรียน และยางพารา',
    days: [
      { date: '2027-08-16', province: 'นครศรีธรรมราช' },
      { date: '2027-08-17', province: 'นครศรีธรรมราช' },
      { date: '2027-08-18', province: 'พัทลุง' },
      { date: '2027-08-19', province: 'พัทลุง' },
      { date: '2027-08-20', province: 'พัทลุง' },
    ],
    // หัวตารางระบุรถกระบะ "รวม ๒ คัน" แต่รายละเอียดรายวันระบุ สฎ1/สข1/กบ1/ยล1 (= 4 คัน)
    // เก็บทั้งสองค่าตามต้นฉบับ ไม่ปรับให้ตรงกันจนกว่าผู้ดูแลระบบยืนยัน
    headerTotals: { crane: null, pickup: 2, staff: 6 },
    allocations: {
      SURAT: { staff: 2, crane: 0, pickup: 1 },
      SONGKHLA: { staff: 2, crane: 0, pickup: 1 },
      KRABI: { staff: 1, crane: 0, pickup: 1 },
      YALA: { staff: 1, crane: 0, pickup: 1 },
    },
  },
]

export const SEED_ISSUES: PlanIssue[] = [
  {
    id: 'R4-PICKUP',
    roundId: 4,
    resource: 'pickup',
    title: 'รอยืนยันแผนรถกระบะรอบที่ 4',
    detail:
      'หัวตารางแผนเดือนสิงหาคม 2570 ระบุรถกระบะ "รวม 2 คัน" แต่รายละเอียดรายวันระบุ สฎ 1 / สข 1 / กบ 1 / ยล 1 รวม 4 คัน ระบบเก็บค่าทั้งสองไว้และคำนวณตามรายละเอียดรายหน่วยงานชั่วคราว',
    sourceValues: [
      { label: 'หัวตาราง', value: '2 คัน' },
      { label: 'รายละเอียดรายหน่วยงาน', value: 'สฎ 1 / สข 1 / กบ 1 / ยล 1 = 4 คัน' },
    ],
    blocking: true,
    status: 'open',
  },
  {
    id: 'R2-D15-NOTE',
    roundId: 2,
    title: 'หมายเหตุวันที่ 15 มีนาคม 2570 อ่านไม่ครบ',
    detail:
      'ช่องหมายเหตุของวันที่ 15 มี.ค. ระบุว่า "แบ่ง 2 สายแยกเป็น…" ข้อความถูกตัด ไม่ทราบว่าแบ่งสายอย่างไร ใช้ทรัพยากรสายละเท่าใด',
    sourceValues: [{ label: 'ข้อความในเอกสาร', value: 'แบ่ง 2 สายแยกเป็น' }],
    blocking: false,
    status: 'open',
  },
  {
    id: 'R4-CRANE',
    roundId: 4,
    resource: 'crane',
    title: 'รอบที่ 4 ไม่มีคอลัมน์รถเครน',
    detail: 'ตารางแผนเดือนสิงหาคม 2570 ไม่มีคอลัมน์รถเครน ระบบถือว่าไม่ใช้รถเครนในรอบนี้ (0 คัน) โปรดยืนยัน',
    blocking: false,
    status: 'open',
  },
]

export const roundTitle = (r: Round) => `รอบที่ ${r.id}`
