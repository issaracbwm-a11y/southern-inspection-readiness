import * as React from 'react'
import { Expand, Gavel, Minimize, Plus, Trash2 } from 'lucide-react'
import { useApp } from '@/lib/app-context'
import { RESOURCES, unitByCode } from '@/data/plan'
import { roundDateRange, roundProvinces, thaiDate } from '@/lib/readiness'
import { ResourceLine, ReadinessMatrix } from '@/components/RoundBlocks'
import { StatusBadge } from '@/lib/status-ui'
import { Button } from '@/components/ui/button'
import { ConfirmButton } from '@/components/ui/confirm-button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input, Label, Textarea } from '@/components/ui/input'
import { cn } from '@/lib/utils'

export default function MeetingPage() {
  const { summaries, data, user, repo, toast, reload } = useApp()
  const [roundId, setRoundId] = React.useState(1)
  const [full, setFull] = React.useState(false)
  const [d, setD] = React.useState({ topic: '', decision: '', allocation: '', owner: '', dueDate: '' })
  const ref = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const h = () => setFull(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', h)
    return () => document.removeEventListener('fullscreenchange', h)
  }, [])

  const s = summaries.find((x) => x.round.id === roundId)
  if (!data || !s || !user) return <p className="text-muted-foreground">กำลังโหลด…</p>

  // ปัญหาที่ต้องตัดสินใจ: ข้อขัดแย้งของแผน + หน่วยงานไม่พร้อม/พร้อมบางส่วน + คำขอสนับสนุน
  const decisionsNeeded: { tone: string; text: string }[] = [
    ...s.openIssues.map((i) => ({ tone: i.blocking ? 'text-pending' : 'text-muted-foreground', text: `${i.title}${i.blocking ? ' (ต้องยืนยันแผน)' : ''}` })),
    ...s.units
      .filter((u) => u.result.status === 'not_ready' || u.result.status === 'partial')
      .map((u) => ({ tone: u.result.status === 'not_ready' ? 'text-notready' : 'text-partial', text: `${unitByCode(u.unit).short}: ${u.result.reasons.join(', ')}` })),
    ...s.units
      .filter((u) => u.resp?.status === 'submitted' && u.resp.needsSupport)
      .map((u) => ({
        tone: 'text-primary',
        text: `${unitByCode(u.unit).short} ขอสนับสนุน: ${[
          u.resp!.supportStaff && `เจ้าหน้าที่ ${u.resp!.supportStaff}`, u.resp!.supportCrane && `รถเครน ${u.resp!.supportCrane}`,
          u.resp!.supportPickup && `รถกระบะ ${u.resp!.supportPickup}`, u.resp!.supportDetail,
        ].filter(Boolean).join(', ')}`,
      })),
  ]
  const decisions = data.decisions.filter((x) => x.roundId === roundId)

  return (
    <div ref={ref} className={cn('meeting space-y-4', full && 'overflow-y-auto bg-background p-6')}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-muted-foreground">วาระพิจารณาความพร้อม · Meeting Mode</div>
          <h1 className="text-2xl font-bold sm:text-3xl">รอบที่ {s.round.id} · {s.round.commodity}</h1>
          <div className="text-muted-foreground">{roundDateRange(s.round)} · จ.{roundProvinces(s.round).join(', ')}</div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {summaries.map((x) => (
            <Button key={x.round.id} variant={x.round.id === roundId ? 'default' : 'outline'} size="lg" onClick={() => setRoundId(x.round.id)}>
              รอบ {x.round.id}
            </Button>
          ))}
          <Button
            variant="outline" size="lg" className="no-print"
            onClick={() => (document.fullscreenElement ? document.exitFullscreen() : ref.current?.requestFullscreen?.())}
          >
            {full ? <Minimize /> : <Expand />} {full ? 'ออกเต็มจอ' : 'เต็มจอ'}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-5">
        <Card className="xl:col-span-3">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-xl">ตารางความพร้อม 4 หน่วยงาน</CardTitle>
            <StatusBadge status={s.overall} className="text-sm" label={s.overall === 'no_response' && s.answered > 0 ? `รอตอบ ${s.total - s.answered} หน่วยงาน` : undefined} />
          </CardHeader>
          <CardContent>
            <ReadinessMatrix summaries={summaries} roundFilter={roundId} large />
          </CardContent>
        </Card>
        <Card className="xl:col-span-2">
          <CardHeader><CardTitle className="text-xl">ทรัพยากร: แผน vs ยืนยัน</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {s.resources.map((rs) => <ResourceLine key={rs.r} rs={rs} big />)}
            <div className="rounded-lg bg-muted p-3">
              <div className="mb-1 font-semibold">ทรัพยากรที่ขาด (วันที่ขาดมากที่สุด)</div>
              {s.resources.every((r) => r.maxShort === 0) ? (
                <div className="text-ready">ไม่มี</div>
              ) : (
                <ul className="space-y-0.5">
                  {s.resources.filter((r) => r.maxShort > 0).map((r) => {
                    const meta = RESOURCES.find((m) => m.key === r.r)!
                    const worst = r.readyByDay.indexOf(Math.min(...r.readyByDay))
                    return (
                      <li key={r.r} className="text-notready">
                        <b>{meta.label} ขาด {r.maxShort} {meta.unit}</b>
                        <span className="text-sm text-muted-foreground"> (เช่น {thaiDate(s.round.days[worst].date, true)}) · รวม {r.shortUnitDays} {meta.unit}-วัน</span>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
            <div>
              <div className="mb-1 font-semibold">หน่วยงานที่ยังไม่ตอบ</div>
              {s.unanswered.length === 0 ? <span className="text-ready">ตอบครบแล้ว</span> : (
                <div className="flex flex-wrap gap-2">
                  {s.unanswered.map((u) => <StatusBadge key={u} status="no_response" label={unitByCode(u).short} className="text-sm" />)}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-xl">ปัญหาที่ต้องตัดสินใจ</CardTitle></CardHeader>
          <CardContent>
            {decisionsNeeded.length === 0 ? <p className="text-muted-foreground">ไม่มีประเด็นค้าง</p> : (
              <ol className="list-decimal space-y-1.5 pl-6">
                {decisionsNeeded.map((x, i) => <li key={i} className={x.tone}>{x.text}</li>)}
              </ol>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl"><Gavel className="size-5" /> ข้อสรุปที่ประชุม</CardTitle>
            <p className="text-xs text-muted-foreground">บันทึกแยกจากข้อมูลที่หน่วยงานส่ง · {user.role === 'admin' ? 'ผู้ดูแลระบบบันทึกได้' : 'ดูอย่างเดียว'}</p>
          </CardHeader>
          <CardContent className="space-y-3">
            {decisions.length === 0 && <p className="text-sm text-muted-foreground">ยังไม่มีข้อสรุป</p>}
            {decisions.map((x) => (
              <div key={x.id} className="rounded-lg border border-border p-3 text-base">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    {x.topic && <div className="text-sm font-semibold text-muted-foreground">{x.topic}</div>}
                    <div className="font-semibold">{x.decision}</div>
                  </div>
                  {user.role === 'admin' && (
                    <ConfirmButton size="sm" variant="ghost" className="no-print" aria-label="ลบ" confirmText="กดอีกครั้งเพื่อลบ"
                      onConfirm={async () => { await repo.deleteDecision(x.id, user); await reload() }}>
                      <Trash2 />
                    </ConfirmButton>
                  )}
                </div>
                {x.allocation && <div className="text-sm">การจัดสรรเพิ่มเติม: {x.allocation}</div>}
                <div className="text-sm text-muted-foreground">
                  ผู้รับผิดชอบ: {x.owner || '-'} · กำหนดดำเนินการ: {x.dueDate ? thaiDate(x.dueDate, true) : '-'}
                </div>
              </div>
            ))}
            {user.role === 'admin' && (
              <form
                className="no-print space-y-2 rounded-lg bg-muted p-3"
                onSubmit={async (e) => {
                  e.preventDefault()
                  if (!d.decision.trim()) return
                  try {
                    await repo.addDecision({ roundId, ...d }, user)
                    setD({ topic: '', decision: '', allocation: '', owner: '', dueDate: '' })
                    await reload()
                    toast('บันทึกข้อสรุปแล้ว')
                  } catch (x) { toast((x as Error).message, 'err') }
                }}
              >
                <Input placeholder="ประเด็น (ถ้ามี)" value={d.topic} onChange={(e) => setD({ ...d, topic: e.target.value })} />
                <Textarea placeholder="ข้อสรุปที่ประชุม *" required value={d.decision} onChange={(e) => setD({ ...d, decision: e.target.value })} />
                <Input placeholder="การจัดสรรทรัพยากรเพิ่มเติม" value={d.allocation} onChange={(e) => setD({ ...d, allocation: e.target.value })} />
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder="ผู้รับผิดชอบ" value={d.owner} onChange={(e) => setD({ ...d, owner: e.target.value })} />
                  <div>
                    <Label className="sr-only">กำหนดดำเนินการ</Label>
                    <Input type="date" value={d.dueDate} onChange={(e) => setD({ ...d, dueDate: e.target.value })} />
                  </div>
                </div>
                <Button type="submit"><Plus /> เพิ่มข้อสรุป</Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
