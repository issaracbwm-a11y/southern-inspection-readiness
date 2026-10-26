import * as React from 'react'
import { CheckCircle2, RotateCcw, Save, FlaskConical, Users } from 'lucide-react'
import { useApp } from '@/lib/app-context'
import { RESOURCES, UNITS } from '@/data/plan'
import { resetDemo } from '@/lib/repo-demo'
import { roundDateRange, thaiDateTime } from '@/lib/readiness'
import { Button } from '@/components/ui/button'
import { ConfirmButton } from '@/components/ui/confirm-button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input, Select, Textarea } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import type { AppUser, Round } from '@/lib/types'

export default function AdminPage() {
  const { data, user, repo, toast, reload } = useApp()
  if (!data || !user) return null
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold sm:text-2xl">จัดการแผน (ผู้ดูแลระบบ)</h1>
        <p className="text-sm text-muted-foreground">ยืนยันประเด็นที่ข้อมูลต้นฉบับขัดแย้ง และแก้ไขแผนเมื่อได้รับการยืนยันแล้วเท่านั้น</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>รายการรอยืนยันจากเอกสารต้นฉบับ</CardTitle>
          <CardDescription>การกด "ยืนยันแล้ว" ไม่เปลี่ยนตัวเลขแผนอัตโนมัติ — ถ้าตัวเลขต้องเปลี่ยน ให้แก้ในส่วน "แก้ไขแผน" ด้านล่างด้วย</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.issues.map((i) => <IssueRow key={i.id} issue={i} />)}
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        {data.rounds.map((r) => <PlanEditor key={r.id} round={r} />)}
      </div>

      {repo.mode === 'supabase' && <UsersCard />}

      {repo.mode === 'demo' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><FlaskConical className="size-5" /> เครื่องมือโหมดสาธิต</CardTitle>
            <CardDescription>ใช้ทดลองเท่านั้น ข้อมูลอยู่ในเบราว์เซอร์นี้</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={async () => { resetDemo(true); await reload(); toast('โหลดข้อมูลทดสอบ 10 กรณีแล้ว') }}>โหลดข้อมูลทดสอบ</Button>
            <ConfirmButton variant="outline" confirmText="กดอีกครั้งเพื่อล้างข้อมูลทั้งหมด" onConfirm={async () => { resetDemo(false); await reload(); toast('ล้างข้อมูลแล้ว', 'info') }}>
              <RotateCcw /> ล้างข้อมูลทั้งหมด
            </ConfirmButton>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function IssueRow({ issue }: { issue: NonNullable<ReturnType<typeof useApp>['data']>['issues'][number] }) {
  const { user, repo, reload, toast } = useApp()
  const [text, setText] = React.useState('')
  const resolved = issue.status === 'resolved'
  return (
    <div className={cn('rounded-xl border p-3', resolved ? 'border-ready/30 bg-ready-soft/40' : issue.blocking ? 'border-pending/40 bg-pending-soft/50' : 'border-border')}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="font-semibold">รอบที่ {issue.roundId} · {issue.title}</div>
        <span className={cn('text-xs font-semibold', resolved ? 'text-ready' : issue.blocking ? 'text-pending' : 'text-muted-foreground')}>
          {resolved ? 'ยืนยันแล้ว' : issue.blocking ? 'กระทบการตัดสินใจ' : 'รอยืนยัน'}
        </span>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{issue.detail}</p>
      {issue.sourceValues && (
        <div className="mt-1 flex flex-wrap gap-2 text-xs">
          {issue.sourceValues.map((v) => <span key={v.label} className="rounded border border-border bg-card px-2 py-0.5">{v.label}: <b>{v.value}</b></span>)}
        </div>
      )}
      {resolved ? (
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-sm">
          <span><CheckCircle2 className="mr-1 inline size-4 text-ready" />{issue.resolution} <span className="text-xs text-muted-foreground">({issue.resolvedBy}, {thaiDateTime(issue.resolvedAt)})</span></span>
          <Button size="sm" variant="ghost" onClick={async () => { await repo.resolveIssue(issue.id, '', true, user!); await reload() }}>เปิดใหม่</Button>
        </div>
      ) : (
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <Textarea className="min-h-10" placeholder="ผลการยืนยัน เช่น ยืนยันตามหนังสือ/ที่ประชุม ใช้รถกระบะ 4 คัน (สฎ1 สข1 กบ1 ยล1)" value={text} onChange={(e) => setText(e.target.value)} />
          <Button disabled={!text.trim()} onClick={async () => {
            try { await repo.resolveIssue(issue.id, text.trim(), false, user!); await reload(); toast('บันทึกการยืนยันแล้ว') } catch (e) { toast((e as Error).message, 'err') }
          }}><CheckCircle2 /> ยืนยันแล้ว</Button>
        </div>
      )}
    </div>
  )
}

function PlanEditor({ round }: { round: Round }) {
  const { user, repo, reload, toast } = useApp()
  const [r, setR] = React.useState<Round>(round)
  React.useEffect(() => setR(round), [round])
  const dirty = JSON.stringify(r) !== JSON.stringify(round)
  return (
    <Card>
      <CardHeader>
        <CardTitle>แก้ไขแผน · รอบที่ {round.id}</CardTitle>
        <CardDescription>{roundDateRange(round)} · {round.commodity} · จำนวนต่อวัน</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="data-table">
            <thead>
              <tr><th>หน่วยงาน</th>{RESOURCES.map((x) => <th key={x.key} className="text-center">{x.label}</th>)}</tr>
            </thead>
            <tbody>
              {UNITS.map((u) => (
                <tr key={u.code}>
                  <td>{u.short}</td>
                  {RESOURCES.map((x) => (
                    <td key={x.key}>
                      <Input type="number" min={0} inputMode="numeric" className="h-9 w-20 text-center mx-auto" value={r.allocations[u.code][x.key]}
                        onChange={(e) => setR({ ...r, allocations: { ...r.allocations, [u.code]: { ...r.allocations[u.code], [x.key]: Math.max(0, Number(e.target.value) || 0) } } })} />
                    </td>
                  ))}
                </tr>
              ))}
              <tr>
                <td className="text-xs text-muted-foreground">หัวตารางต้นฉบับ</td>
                {RESOURCES.map((x) => (
                  <td key={x.key}>
                    <Input className="h-9 w-20 text-center mx-auto" placeholder="ไม่มี" value={r.headerTotals[x.key] ?? ''}
                      onChange={(e) => setR({ ...r, headerTotals: { ...r.headerTotals, [x.key]: e.target.value === '' ? null : Math.max(0, Number(e.target.value) || 0) } })} />
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
        <div className="flex gap-2">
          <ConfirmButton disabled={!dirty} confirmText="ยืนยันว่าได้รับอนุมัติแล้ว – กดอีกครั้ง" onConfirm={async () => {
            try { await repo.updateRoundPlan(r, user!); await reload(); toast('บันทึกแผนแล้ว') } catch (e) { toast((e as Error).message, 'err') }
          }}><Save /> บันทึกแผน</ConfirmButton>
          {dirty && <Button variant="ghost" onClick={() => setR(round)}>ยกเลิก</Button>}
        </div>
      </CardContent>
    </Card>
  )
}

function UsersCard() {
  const { repo, toast } = useApp()
  const [users, setUsers] = React.useState<AppUser[]>([])
  React.useEffect(() => { void repo.listUsers?.().then(setUsers) }, [repo])
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Users className="size-5" /> ผู้ใช้งาน</CardTitle>
        <CardDescription>สร้างบัญชีใน Supabase (Authentication → Users → Invite) แล้วกำหนดบทบาท/หน่วยงานที่นี่</CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="data-table">
          <thead><tr><th>ชื่อ</th><th>อีเมล</th><th>บทบาท</th><th>หน่วยงาน</th><th /></tr></thead>
          <tbody>
            {users.map((u, idx) => (
              <tr key={u.id}>
                <td><Input className="h-9" value={u.displayName} onChange={(e) => setUsers(users.map((x, i) => (i === idx ? { ...x, displayName: e.target.value } : x)))} /></td>
                <td className="text-xs">{u.email}</td>
                <td>
                  <Select className="h-9" value={u.role} onChange={(e) => setUsers(users.map((x, i) => (i === idx ? { ...x, role: e.target.value as AppUser['role'] } : x)))}>
                    <option value="admin">ผู้ดูแลระบบ</option>
                    <option value="unit_officer">เจ้าหน้าที่หน่วยงาน</option>
                    <option value="executive">ผู้บริหาร (ดูอย่างเดียว)</option>
                  </Select>
                </td>
                <td>
                  <Select className="h-9" value={u.unit ?? ''} onChange={(e) => setUsers(users.map((x, i) => (i === idx ? { ...x, unit: (e.target.value || null) as AppUser['unit'] } : x)))}>
                    <option value="">-</option>
                    {UNITS.map((x) => <option key={x.code} value={x.code}>{x.short}</option>)}
                  </Select>
                </td>
                <td>
                  <Button size="sm" onClick={async () => {
                    try { await repo.updateUser?.(u); toast('บันทึกผู้ใช้แล้ว') } catch (e) { toast((e as Error).message, 'err') }
                  }}>บันทึก</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  )
}
