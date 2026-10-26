import { useNavigate } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, Legend as RLegend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useApp } from '@/lib/app-context'
import { RoundCard, ReadinessMatrix } from '@/components/RoundBlocks'
import { IssuesBanner } from '@/components/IssuesBanner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { STATUS } from '@/lib/status-ui'
import { cn } from '@/lib/utils'
import type { ReadinessStatus } from '@/lib/types'

export default function DashboardPage() {
  const { summaries, data } = useApp()
  const nav = useNavigate()
  if (!data) return <p className="text-muted-foreground">กำลังโหลด…</p>

  const cells = summaries.flatMap((s) => s.units)
  const count = (st: ReadinessStatus) => cells.filter((c) => c.result.status === st).length
  const answered = cells.filter((c) => c.resp?.status === 'submitted').length

  const kpis: { label: string; value: string; sub: string; tone: string }[] = [
    { label: 'ตอบแล้ว', value: `${answered}/${cells.length}`, sub: 'หน่วยงาน × รอบ', tone: 'border-l-primary' },
    { label: STATUS.ready.label, value: String(count('ready')), sub: 'ครบตามแผนทุกวัน', tone: 'border-l-ready' },
    { label: STATUS.partial.label, value: String(count('partial')), sub: 'ขาดบางรายการ/บางวัน', tone: 'border-l-partial-bar' },
    { label: STATUS.not_ready.label, value: String(count('not_ready')), sub: 'เข้าร่วมไม่ได้', tone: 'border-l-notready' },
    { label: STATUS.plan_pending.label, value: String(count('plan_pending')), sub: 'พร้อม แต่แผนยังขัดแย้ง', tone: 'border-l-pending' },
    { label: STATUS.no_response.label, value: String(count('no_response')), sub: 'ฉบับร่างนับเป็นยังไม่ตอบ', tone: 'border-l-noresp-bar' },
  ]

  const chartData = summaries.map((s) => {
    const g = (r: string) => s.resources.find((x) => x.r === r)!
    const crane = g('crane')
    return {
      name: `รอบ ${s.round.id}`,
      เจ้าหน้าที่: g('staff').pct,
      รถเครน: crane.planPerDay === 0 ? null : crane.pct,
      รถกระบะ: g('pickup').pct,
    }
  })

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold sm:text-2xl">ภาพรวมความพร้อม 4 รอบ</h1>
        <p className="text-sm text-muted-foreground">ตัวเลข "พร้อม / แผน" คือจำนวนที่พร้อมได้ทุกวันของรอบ (วันที่น้อยที่สุด) ร้อยละคิดจากผลรวมรายวัน</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {kpis.map((k) => (
          <Card key={k.label} className={cn('border-l-4 p-3 sm:p-4', k.tone)}>
            <div className="text-xs font-medium text-muted-foreground">{k.label}</div>
            <div className="tabular text-2xl font-bold sm:text-3xl">{k.value}</div>
            <div className="text-[11px] text-muted-foreground">{k.sub}</div>
          </Card>
        ))}
      </div>

      <IssuesBanner issues={data.issues} />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summaries.map((s) => (
          <RoundCard key={s.round.id} s={s} onOpen={() => nav(`/daily?round=${s.round.id}`)} />
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Readiness Matrix</CardTitle>
            <CardDescription>สถานะการยืนยันของแต่ละหน่วยงานในแต่ละรอบ</CardDescription>
          </CardHeader>
          <CardContent>
            <ReadinessMatrix summaries={summaries} />
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>ร้อยละความพร้อมตามทรัพยากร</CardTitle>
            <CardDescription>เทียบกับแผน (นับรายวัน) · รอบ 4 ไม่มีรถเครนในแผน</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#dbe3ea" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} unit="%" />
                <Tooltip formatter={(v) => (v === null ? 'ไม่มีในแผน' : `${v}%`)} />
                <RLegend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="เจ้าหน้าที่" fill="#0f3d5e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="รถเครน" fill="#1f8a9f" radius={[4, 4, 0, 0]} />
                <Bar dataKey="รถกระบะ" fill="#f2b33d" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
