import type { AppData } from './repo'
import type { RoundSummary } from './readiness'
import { roundDateRange, roundProvinces, thaiDate, thaiDateTime } from './readiness'
import { RESOURCES, UNITS, unitByCode } from '@/data/plan'
import { STATUS } from './status-ui'
import { dayRows } from './rows'

export interface ReportTable {
  title: string
  headers: string[]
  rows: (string | number)[][]
  statusCol?: number
  note?: string
}
export interface Report {
  key: string
  title: string
  tables: ReportTable[]
}

const fmtRes = (s: RoundSummary, r: string) => {
  const x = s.resources.find((y) => y.r === r)!
  if (x.planPerDay === 0) return 'ไม่มีในแผน'
  return `${x.minReady}/${x.planPerDay} (${x.pct}%)${x.conflict ? ` *หัวตาราง ${x.headerTotal}` : ''}`
}

export function buildReports(data: AppData, summaries: RoundSummary[]): Report[] {
  const byRound: ReportTable = {
    title: 'ความพร้อมรายรอบ',
    headers: ['รอบ', 'วันที่', 'จังหวัด', 'สินค้า', 'ตอบแล้ว', 'เจ้าหน้าที่ พร้อม/แผน', 'รถเครน พร้อม/แผน', 'รถกระบะ พร้อม/แผน', 'สถานะรวม'],
    rows: summaries.map((s) => [
      s.round.id, roundDateRange(s.round), roundProvinces(s.round).join(', '), s.round.commodity, `${s.answered}/${s.total}`,
      fmtRes(s, 'staff'), fmtRes(s, 'crane'), fmtRes(s, 'pickup'), STATUS[s.overall].label,
    ]),
    statusCol: 8,
    note: 'พร้อม/แผน = จำนวนที่พร้อมได้ทุกวัน (วันต่ำสุด) ต่อจำนวนตามแผนต่อวัน · ร้อยละคำนวณจากผลรวมรายวัน · * หัวตารางเอกสารต้นฉบับไม่ตรงกับรายละเอียด (รอยืนยัน)',
  }

  const byUnit: ReportTable = {
    title: 'ความพร้อมรายหน่วยงาน',
    headers: ['หน่วยงาน', 'รอบ', 'สถานะ', 'เหตุผล/รายละเอียด', 'ผู้ประสานงาน', 'โทรศัพท์', 'ขอสนับสนุน', 'ส่งยืนยันล่าสุด'],
    rows: UNITS.flatMap((u) =>
      summaries.map((s) => {
        const c = s.units.find((x) => x.unit === u.code)!
        const r = c.resp?.status === 'submitted' ? c.resp : undefined
        return [
          u.short, s.round.id, STATUS[c.result.status].label, c.result.reasons.join(', '), r?.coordinatorName ?? '', r?.coordinatorPhone ?? '',
          r?.needsSupport ? [r.supportStaff && `จนท. ${r.supportStaff}`, r.supportCrane && `เครน ${r.supportCrane}`, r.supportPickup && `กระบะ ${r.supportPickup}`, r.supportDetail].filter(Boolean).join(', ') : '',
          r ? thaiDateTime(r.submittedAt) : '',
        ]
      }),
    ),
    statusCol: 2,
  }

  const rows = dayRows(data)
  const daily: ReportTable = {
    title: 'ความพร้อมรายวัน',
    headers: ['วันที่', 'รอบ', 'จังหวัด', 'หน่วยงาน', 'จนท. แผน', 'จนท. พร้อม', 'เครน แผน', 'เครน พร้อม', 'กระบะ แผน', 'กระบะ พร้อม', 'สถานะ', 'หมายเหตุ'],
    rows: rows.map((r) => [
      thaiDate(r.date, true), r.roundId, r.province, r.unit === 'ALL' ? 'รวม' : unitByCode(r.unit).short,
      r.plan.staff, r.ready.staff ?? '–', r.plan.crane, r.ready.crane ?? '–', r.plan.pickup, r.ready.pickup ?? '–',
      STATUS[r.status].label, r.note,
    ]),
    statusCol: 10,
    note: '"–" = ยังไม่ตอบ',
  }

  const shortage: ReportTable = {
    title: 'สรุปทรัพยากรที่ขาด (รายรอบ)',
    headers: ['รอบ', 'ทรัพยากร', 'แผนต่อวัน', 'พร้อมได้ทุกวัน', 'ขาดสูงสุด/วัน', 'ขาดรวม (หน่วย-วัน)', 'ร้อยละความพร้อม'],
    rows: summaries.flatMap((s) =>
      s.resources.filter((r) => r.planPerDay > 0).map((r) => {
        const m = RESOURCES.find((x) => x.key === r.r)!
        return [s.round.id, m.label, `${r.planPerDay} ${m.unit}`, `${r.minReady} ${m.unit}`, r.maxShort, r.shortUnitDays, `${r.pct}%`]
      }),
    ),
  }
  const shortageUnit: ReportTable = {
    title: 'สรุปทรัพยากรที่ขาด (รายหน่วยงาน/รายวัน – เฉพาะที่ส่งยืนยันแล้ว)',
    headers: ['วันที่', 'รอบ', 'หน่วยงาน', 'รายการที่ขาด'],
    rows: rows
      .filter((r) => r.status !== 'no_response')
      .map((r) => {
        const items = RESOURCES.filter((m) => (r.ready[m.key] ?? 0) < r.plan[m.key]).map((m) => `${m.label} ${r.plan[m.key] - (r.ready[m.key] ?? 0)} ${m.unit}`)
        return [thaiDate(r.date, true), r.roundId, r.unit === 'ALL' ? 'รวม' : unitByCode(r.unit).short, items.join(', ')]
      })
      .filter((r) => r[3]),
  }

  const unanswered: ReportTable = {
    title: 'รายชื่อหน่วยงานที่ยังไม่ตอบ',
    headers: ['รอบ', 'วันที่', 'หน่วยงาน', 'หมายเหตุ'],
    rows: summaries.flatMap((s) =>
      s.unanswered.map((u) => {
        const resp = data.responses.find((x) => x.roundId === s.round.id && x.unit === u)
        return [s.round.id, roundDateRange(s.round), unitByCode(u).name, resp ? 'มีฉบับร่าง ยังไม่ส่งยืนยัน' : 'ยังไม่ได้เริ่มกรอก']
      }),
    ),
  }

  const meeting: ReportTable[] = summaries.flatMap((s) => [
    {
      title: `รอบที่ ${s.round.id} · ${s.round.commodity} · ${roundDateRange(s.round)} — สถานะรวม: ${STATUS[s.overall].label}`,
      headers: ['หน่วยงาน', 'สถานะ', 'รายละเอียด'],
      rows: s.units.map((u) => [unitByCode(u.unit).short, STATUS[u.result.status].label, u.result.reasons.join(', ')]),
      statusCol: 1,
      note: [
        `ทรัพยากร (พร้อม/แผนต่อวัน): เจ้าหน้าที่ ${fmtRes(s, 'staff')} · รถเครน ${fmtRes(s, 'crane')} · รถกระบะ ${fmtRes(s, 'pickup')}`,
        s.openIssues.length ? `ประเด็นรอยืนยัน: ${s.openIssues.map((i) => i.title).join('; ')}` : '',
      ].filter(Boolean).join('\n'),
    },
    {
      title: `ข้อสรุปที่ประชุม รอบที่ ${s.round.id}`,
      headers: ['ประเด็น', 'ข้อสรุป', 'การจัดสรรเพิ่มเติม', 'ผู้รับผิดชอบ', 'กำหนดดำเนินการ'],
      rows: data.decisions.filter((d) => d.roundId === s.round.id).map((d) => [d.topic, d.decision, d.allocation, d.owner, d.dueDate ? thaiDate(d.dueDate, true) : '']),
    },
  ])

  return [
    { key: 'round', title: 'ความพร้อมรายรอบ', tables: [byRound] },
    { key: 'unit', title: 'ความพร้อมรายหน่วยงาน', tables: [byUnit] },
    { key: 'daily', title: 'ความพร้อมรายวัน', tables: [daily] },
    { key: 'shortage', title: 'สรุปทรัพยากรที่ขาด', tables: [shortage, shortageUnit] },
    { key: 'unanswered', title: 'หน่วยงานที่ยังไม่ตอบ', tables: [unanswered] },
    { key: 'meeting', title: 'รายงานประกอบการประชุม', tables: meeting },
  ]
}

const STATUS_FILL: Record<string, string> = {
  [STATUS.ready.label]: 'FFDCFCE7',
  [STATUS.partial.label]: 'FFFEF3C7',
  [STATUS.not_ready.label]: 'FFFEE2E2',
  [STATUS.no_response.label]: 'FFECEFF3',
  [STATUS.plan_pending.label]: 'FFEDE9FE',
}

/** ส่งออก Excel (.xlsx) – ทุกรายงานเป็นแผ่นงานแยก */
export async function exportExcel(reports: Report[], stamp: string) {
  const ExcelJS = (await import('exceljs')).default
  const wb = new ExcelJS.Workbook()
  wb.creator = 'ศูนย์ชั่งตวงวัดภาคใต้ (สุราษฎร์ธานี)'
  for (const rep of reports) {
    const ws = wb.addWorksheet(rep.title.slice(0, 31), { pageSetup: { orientation: 'landscape', paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0 } })
    const font = { name: 'TH SarabunPSK', size: 14 }
    ws.addRow([`${rep.title} — โครงการตรวจสอบเครื่องชั่งตวงวัดสินค้าเกษตรแบบบูรณาการเขตภาคใต้ ปีงบประมาณ 2570`]).font = { ...font, bold: true, size: 16 }
    ws.addRow([`ข้อมูล ณ ${stamp}`]).font = font
    for (const t of rep.tables) {
      ws.addRow([])
      ws.addRow([t.title]).font = { ...font, bold: true }
      const h = ws.addRow(t.headers)
      h.eachCell((c) => {
        c.font = { ...font, bold: true, color: { argb: 'FFFFFFFF' } }
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F3D5E' } }
        c.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
        c.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } }
      })
      if (t.rows.length === 0) ws.addRow(['(ไม่มีข้อมูล)']).font = { ...font, italic: true }
      for (const r of t.rows) {
        const row = ws.addRow(r)
        row.eachCell({ includeEmpty: true }, (c, col) => {
          c.font = font
          c.alignment = { vertical: 'top', wrapText: true }
          c.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } }
          if (t.statusCol !== undefined && col === t.statusCol + 1) {
            const fill = STATUS_FILL[String(c.value)]
            if (fill) c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fill } }
          }
        })
      }
      if (t.note) ws.addRow([t.note]).font = { ...font, italic: true, size: 12 }
    }
    const widths = Math.max(...rep.tables.map((t) => t.headers.length))
    for (let i = 1; i <= widths; i++) ws.getColumn(i).width = i === 1 ? 18 : 16
  }
  const buf = await wb.xlsx.writeBuffer()
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `รายงานความพร้อมตรวจบูรณาการภาคใต้-2570.xlsx`
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 2000)
}
