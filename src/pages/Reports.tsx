import * as React from 'react'
import { FileSpreadsheet, Printer } from 'lucide-react'
import { useApp } from '@/lib/app-context'
import { buildReports, exportExcel, type Report } from '@/lib/reports'
import { STATUS } from '@/lib/status-ui'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

const inFrame = (() => { try { return window.self !== window.top } catch { return true } })()

const statusClass = (v: string | number) => {
  const s = Object.values(STATUS).find((x) => x.label === v)
  return s ? s.soft + ' font-semibold' : ''
}

export default function ReportsPage() {
  const { data, summaries, repo, toast } = useApp()
  const [sel, setSel] = React.useState('round')
  const [all, setAll] = React.useState(false)
  const reports = React.useMemo(() => (data ? buildReports(data, summaries) : []), [data, summaries])
  if (!data) return <p className="text-muted-foreground">กำลังโหลด…</p>
  const stamp = new Date().toLocaleString('th-TH', { dateStyle: 'long', timeStyle: 'short' })
  const shown = all ? reports : reports.filter((r) => r.key === sel)

  return (
    <div className="space-y-4">
      <div className="no-print flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">รายงาน</h1>
          <p className="text-sm text-muted-foreground">ส่งออก Excel ได้ทุกรายงานในไฟล์เดียว · PDF ใช้คำสั่งพิมพ์ของเบราว์เซอร์ แล้วเลือก "บันทึกเป็น PDF" (รองรับภาษาไทยครบ)</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={async () => {
            try { await exportExcel(reports, stamp); toast('ดาวน์โหลดไฟล์ Excel แล้ว') } catch (e) { toast((e as Error).message, 'err') }
          }}><FileSpreadsheet /> ส่งออก Excel</Button>
          <Button onClick={() => window.print()}><Printer /> พิมพ์ / บันทึก PDF</Button>
        </div>
      </div>

      <div className="no-print flex flex-wrap gap-2">
        {reports.map((r) => (
          <button key={r.key} onClick={() => { setSel(r.key); setAll(false) }}
            className={cn('rounded-full border px-3.5 py-1.5 text-sm', !all && sel === r.key ? 'border-primary bg-primary text-white' : 'border-border bg-card hover:bg-muted')}>
            {r.title}
          </button>
        ))}
        <button onClick={() => setAll(true)} className={cn('rounded-full border px-3.5 py-1.5 text-sm', all ? 'border-primary bg-primary text-white' : 'border-border bg-card hover:bg-muted')}>
          ทุกรายงาน
        </button>
      </div>

      {inFrame && <p className="no-print rounded-lg border border-partial/30 bg-partial-soft px-3 py-2 text-sm text-partial">หน้าตัวอย่างนี้เปิดอยู่ในกรอบแสดงผล จึงดาวน์โหลด Excel และพิมพ์ PDF ไม่ได้ — ใช้งานได้ปกติเมื่อเปิดจากเว็บไซต์ GitHub Pages</p>}
      {repo.mode === 'demo' && <p className="no-print text-xs font-semibold text-partial">ข้อมูลในรายงานมาจากโหมดสาธิต (เบราว์เซอร์เครื่องนี้) ไม่ใช่ฐานข้อมูลกลาง</p>}

      {shown.map((rep, i) => <ReportView key={rep.key} rep={rep} stamp={stamp} demo={repo.mode === 'demo'} breakBefore={i > 0} />)}
    </div>
  )
}

function ReportView({ rep, stamp, demo, breakBefore }: { rep: Report; stamp: string; demo: boolean; breakBefore: boolean }) {
  return (
    <Card className={cn('print-area space-y-4 p-4 sm:p-6', breakBefore && 'print-break')}>
      <div className="text-center">
        <div className="text-lg font-bold">{rep.title}</div>
        <div className="text-sm">โครงการตรวจสอบเครื่องชั่งตวงวัดสินค้าเกษตรแบบบูรณาการเขตภาคใต้ ปีงบประมาณ 2570</div>
        <div className="text-xs text-muted-foreground">ศูนย์ชั่งตวงวัดภาคใต้ (สุราษฎร์ธานี) กองชั่งตวงวัด กรมการค้าภายใน · ข้อมูล ณ {stamp}{demo ? ' · (โหมดสาธิต)' : ''}</div>
      </div>
      {rep.tables.map((t) => (
        <div key={t.title} className="space-y-1.5" style={{ breakInside: 'avoid' }}>
          {rep.tables.length > 1 && <div className="font-semibold">{t.title}</div>}
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="data-table">
              <thead><tr>{t.headers.map((h) => <th key={h}>{h}</th>)}</tr></thead>
              <tbody>
                {t.rows.length === 0 && <tr><td colSpan={t.headers.length} className="text-center text-muted-foreground">ไม่มีข้อมูล</td></tr>}
                {t.rows.map((r, i) => (
                  <tr key={i}>
                    {r.map((c, j) => (
                      <td key={j} className={cn('whitespace-pre-wrap', j === t.statusCol && statusClass(c))}>{c}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {t.note && <p className="whitespace-pre-wrap text-xs text-muted-foreground">{t.note}</p>}
        </div>
      ))}
    </Card>
  )
}
