import * as React from 'react'
import { useSearchParams } from 'react-router-dom'
import { CheckCheck, History, Lock, Minus, Pencil, Plus, Save, Send, Wand2 } from 'lucide-react'
import { useApp } from '@/lib/app-context'
import { RESOURCES, UNITS, unitByCode } from '@/data/plan'
import {
  blankResponse, effective, planFor, roundDateRange, thaiDate, thaiDateTime, unitStatus, validateForSubmit,
} from '@/lib/readiness'
import { canEditUnit } from '@/lib/repo'
import { StatusBadge } from '@/lib/status-ui'
import { IssuesBanner } from '@/components/IssuesBanner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox, Input, Label, Select, Textarea } from '@/components/ui/input'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import type { HistoryEntry, Resource, Round, UnitCode, UnitResponse } from '@/lib/types'

export default function SurveyPage() {
  const { data, user, repo, toast, reload } = useApp()
  const [params, setParams] = useSearchParams()
  const roundId = Number(params.get('round') ?? 1)
  const unit = (user?.role === 'unit_officer' ? user.unit : (params.get('unit') as UnitCode)) ?? 'SURAT'
  const round = data?.rounds.find((r) => r.id === roundId)
  const existing = data?.responses.find((r) => r.roundId === roundId && r.unit === unit)

  const [form, setForm] = React.useState<UnitResponse | null>(null)
  const [editing, setEditing] = React.useState(false)
  const [busy, setBusy] = React.useState(false)
  const [errors, setErrors] = React.useState<string[]>([])
  const [hist, setHist] = React.useState<HistoryEntry[] | null>(null)
  const [confirmOpen, setConfirmOpen] = React.useState(false)

  // โหลดฟอร์มเมื่อเปลี่ยนรอบ/หน่วยงาน
  React.useEffect(() => {
    if (!round || !user) return
    setForm(existing ? structuredClone(existing) : blankResponse(round, unit, user.displayName))
    setEditing(!existing || existing.status === 'draft')
    setErrors([])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundId, unit, round?.id, existing?.updatedAt])

  if (!data || !round || !form || !user) return <p className="text-muted-foreground">กำลังโหลด…</p>

  const allowed = canEditUnit(user, unit)
  const readOnly = !allowed || !editing
  const res = RESOURCES.filter((r) => planFor(round, unit, r.key) > 0)
  const set = (patch: Partial<UnitResponse>) => setForm((f) => (f ? { ...f, ...patch } : f))
  const setDay = (date: string, patch: Partial<UnitResponse['days'][number]>) =>
    setForm((f) => (f ? { ...f, days: f.days.map((d) => (d.date === date ? { ...d, ...patch } : d)) } : f))

  const preview = unitStatus(round, unit, { ...form, status: 'submitted' }, data.issues)

  async function save(action: 'draft' | 'submit') {
    if (!form || !user) return
    if (action === 'submit') {
      const errs = validateForSubmit(round!, form)
      setErrors(errs)
      if (errs.length) {
        toast('ยังกรอกข้อมูลไม่ครบ', 'err')
        return
      }
    }
    setBusy(true)
    try {
      await repo.saveResponse(form, action, user)
      await reload()
      setEditing(action === 'draft')
      toast(
        action === 'submit'
          ? repo.mode === 'demo' ? 'ส่งยืนยันแล้ว (โหมดสาธิต: บันทึกในเครื่องนี้เท่านั้น)' : 'ส่งยืนยันความพร้อมเข้าฐานข้อมูลกลางแล้ว'
          : 'บันทึกฉบับร่างแล้ว (ยังไม่นับเป็นการยืนยัน)',
      )
    } catch (e) {
      toast((e as Error).message, 'err')
    }
    setBusy(false)
    setConfirmOpen(false)
  }

  const submitClick = () => {
    const errs = validateForSubmit(round, form)
    setErrors(errs)
    if (errs.length) toast('ยังกรอกข้อมูลไม่ครบ', 'err')
    else setConfirmOpen(true)
  }
  const actions = editing ? (
    <div className="grid grid-cols-2 gap-2">
      <Button variant="outline" disabled={busy} onClick={() => save('draft')}><Save /> บันทึกฉบับร่าง</Button>
      <Button variant="success" disabled={busy} onClick={submitClick}><Send /> ส่งยืนยัน</Button>
    </div>
  ) : (
    <Button variant="outline" className="w-full" onClick={() => setEditing(true)}><Pencil /> แก้ไขข้อมูล</Button>
  )

  return (
    <div className={cn('space-y-4', allowed && 'pb-20 sm:pb-0')}>
      {allowed && (
        <div className="no-print fixed inset-x-0 bottom-[calc(3.6rem+env(safe-area-inset-bottom))] z-30 border-t border-border bg-card/95 px-3 py-2 shadow-[0_-4px_12px_rgba(0,0,0,0.06)] backdrop-blur sm:hidden">
          {actions}
        </div>
      )}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">แบบสำรวจความพร้อม</h1>
          <p className="text-sm text-muted-foreground">{unitByCode(unit).name}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {user.role === 'admin' && (
            <Select value={unit} onChange={(e) => setParams({ round: String(roundId), unit: e.target.value })} className="w-auto">
              {UNITS.map((u) => <option key={u.code} value={u.code}>{u.short}</option>)}
            </Select>
          )}
          <Button variant="outline" onClick={async () => setHist(await repo.history(roundId, unit))}>
            <History /> ดูประวัติการส่ง
          </Button>
        </div>
      </div>

      {/* เลือกรอบการตรวจ */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {data.rounds.map((r) => {
          const resp = data.responses.find((x) => x.roundId === r.id && x.unit === unit)
          const st = unitStatus(r, unit, resp, data.issues).status
          return (
            <button
              key={r.id}
              onClick={() => setParams(user.role === 'admin' ? { round: String(r.id), unit } : { round: String(r.id) })}
              className={cn(
                'rounded-xl border bg-card p-3 text-left transition',
                r.id === roundId ? 'border-primary ring-2 ring-primary/30' : 'border-border hover:border-primary/50',
              )}
            >
              <div className="text-sm font-semibold">รอบที่ {r.id}</div>
              <div className="text-xs text-muted-foreground">{roundDateRange(r)}</div>
              <StatusBadge status={st} className="mt-1.5" />
            </button>
          )
        })}
      </div>

      <IssuesBanner issues={data.issues} roundId={roundId} />

      {!allowed && (
        <div className="flex items-center gap-2 rounded-lg border border-border bg-muted px-4 py-2.5 text-sm">
          <Lock className="size-4" /> ดูได้อย่างเดียว — แก้ไขได้เฉพาะข้อมูลของหน่วยงานตนเอง
        </div>
      )}
      {allowed && existing?.status === 'submitted' && !editing && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-ready/30 bg-ready-soft px-4 py-2.5 text-sm text-ready">
          <span className="flex items-center gap-2"><CheckCheck className="size-4" /> ส่งยืนยันแล้วเมื่อ {thaiDateTime(existing.submittedAt)} โดย {existing.updatedBy}</span>
          <Button size="sm" variant="outline" onClick={() => setEditing(true)}><Pencil /> แก้ไขข้อมูล</Button>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <PlanSummary round={round} unit={unit} form={form} />

          <Card>
            <CardHeader>
              <CardTitle>ความพร้อมรายวัน</CardTitle>
              <CardDescription>ตัวเลข "แผน" กำหนดไว้ล่วงหน้า กรอกเฉพาะจำนวนที่พร้อมจริงของแต่ละวัน · รถเครนและรถกระบะตามแผนหมายถึงพร้อมพนักงานขับรถ</CardDescription>
              {!readOnly && !form.cannotParticipate && (
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() =>
                      set({
                        days: form.days.map((d) => ({
                          ...d, available: true,
                          staff: planFor(round, unit, 'staff'), crane: planFor(round, unit, 'crane'), pickup: planFor(round, unit, 'pickup'),
                        })),
                      })
                    }
                  >
                    <Wand2 /> กรอกเท่าแผนทุกวัน
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent className="space-y-3">
              <Checkbox
                className="rounded-lg border border-notready/30 bg-notready-soft/60 p-3"
                checked={form.cannotParticipate}
                disabled={readOnly}
                onChange={(v) => set({ cannotParticipate: v })}
                label={<span><b className="text-notready">ไม่สามารถเข้าร่วมปฏิบัติงานในรอบนี้ได้</b><br /><span className="text-xs text-muted-foreground">ระบุเหตุผลในช่อง "ปัญหาและข้อจำกัด"</span></span>}
              />
              {!form.cannotParticipate &&
                round.days.map((d) => {
                  const day = form.days.find((x) => x.date === d.date)!
                  return (
                    <div key={d.date} className={cn('rounded-xl border p-3', day.available ? 'border-border' : 'border-dashed border-notready/40 bg-notready-soft/40')}>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <div className="font-semibold">{thaiDate(d.date, false, true)}</div>
                          <div className="text-xs text-muted-foreground">จ.{d.province}{d.note ? ` · หมายเหตุ: ${d.note}` : ''}</div>
                        </div>
                        <Checkbox checked={day.available} disabled={readOnly} onChange={(v) => setDay(d.date, { available: v })} label="พร้อมเข้าร่วมวันนี้" />
                      </div>
                      {day.available && (
                        <div className="mt-3 grid grid-cols-3 gap-2">
                          {res.map((r) => (
                            <NumberField
                              key={r.key}
                              label={r.label}
                              unitLabel={r.unit}
                              plan={planFor(round, unit, r.key)}
                              value={day[r.key]}
                              disabled={readOnly}
                              onChange={(v) => setDay(d.date, { [r.key]: v } as Partial<UnitResponse['days'][number]>)}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader><CardTitle>ผู้ประสานงานและข้อจำกัด</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label>ชื่อผู้ประสานงาน *</Label>
                <Input value={form.coordinatorName} disabled={readOnly} onChange={(e) => set({ coordinatorName: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>เบอร์โทรศัพท์</Label>
                <Input type="tel" inputMode="tel" value={form.coordinatorPhone} disabled={readOnly} onChange={(e) => set({ coordinatorPhone: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>ปัญหาและข้อจำกัด</Label>
                <Textarea value={form.problems} disabled={readOnly} onChange={(e) => set({ problems: e.target.value })} />
              </div>
              <Checkbox checked={form.constraintUnresolved} disabled={readOnly} onChange={(v) => set({ constraintUnresolved: v })}
                label="มีข้อจำกัดสำคัญที่ยังแก้ไขไม่ได้ (ทำให้สถานะเป็น พร้อมบางส่วน)" />
              <div className="space-y-1.5">
                <Label>หมายเหตุ</Label>
                <Textarea value={form.notes} disabled={readOnly} onChange={(e) => set({ notes: e.target.value })} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>การขอรับการสนับสนุน</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Checkbox checked={form.needsSupport} disabled={readOnly} onChange={(v) => set({ needsSupport: v })} label="ต้องการขอรับการสนับสนุนทรัพยากรเพิ่มเติม" />
              {form.needsSupport && (
                <>
                  <div className="grid grid-cols-3 gap-2">
                    {([['supportStaff', 'เจ้าหน้าที่'], ['supportCrane', 'รถเครน'], ['supportPickup', 'รถกระบะ']] as const).map(([k, l]) => (
                      <div key={k} className="space-y-1">
                        <Label className="text-xs">{l}</Label>
                        <Input type="number" inputMode="numeric" min={0} value={form[k]} disabled={readOnly}
                          onChange={(e) => set({ [k]: Math.max(0, Number(e.target.value) || 0) } as Partial<UnitResponse>)} />
                      </div>
                    ))}
                  </div>
                  <Textarea placeholder="รายละเอียดเพิ่มเติม" value={form.supportDetail} disabled={readOnly} onChange={(e) => set({ supportDetail: e.target.value })} />
                </>
              )}
            </CardContent>
          </Card>

          {allowed && (
            <Card className="border-primary/30 shadow-md lg:order-first">
              <CardContent className="space-y-3 pt-4 sm:pt-5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">สถานะหากส่งตอนนี้</span>
                  <StatusBadge status={preview.status} />
                </div>
                {errors.length > 0 && (
                  <ul className="list-disc space-y-0.5 rounded-lg bg-notready-soft py-2 pl-7 pr-3 text-sm text-notready">
                    {errors.map((e) => <li key={e}>{e}</li>)}
                  </ul>
                )}
                <div className="hidden sm:block">{actions}</div>
                {editing && existing?.status === 'submitted' && (
                  <p className="text-xs text-muted-foreground">หมายเหตุ: หากกด "บันทึกฉบับร่าง" ระหว่างแก้ไข สถานะจะกลับเป็น "ยังไม่ตอบ" จนกว่าจะส่งยืนยันใหม่</p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent title="ยืนยันการส่งข้อมูลความพร้อม" description={`${unitByCode(unit).name} · รอบที่ ${roundId}`}>
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm">สถานะที่จะแสดงบนแดชบอร์ด: <StatusBadge status={preview.status} /></div>
            <ul className="list-disc pl-5 text-sm text-muted-foreground">{preview.reasons.map((r) => <li key={r}>{r}</li>)}</ul>
            {repo.mode === 'demo' && <p className="rounded-lg bg-accent/30 p-2 text-sm">โหมดสาธิต: ข้อมูลจะถูกเก็บในเบราว์เซอร์เครื่องนี้เท่านั้น ยังไม่เข้าฐานข้อมูลกลาง</p>}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setConfirmOpen(false)}>ยกเลิก</Button>
              <Button variant="success" disabled={busy} onClick={() => save('submit')}><Send /> ยืนยันส่ง</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!hist} onOpenChange={(v) => !v && setHist(null)}>
        <DialogContent title="ประวัติการส่ง" description={`${unitByCode(unit).short} · รอบที่ ${roundId}`}>
          {hist && hist.length === 0 && <p className="text-sm text-muted-foreground">ยังไม่มีประวัติ</p>}
          <ol className="space-y-2">
            {hist?.map((h) => (
              <li key={h.id} className="rounded-lg border border-border p-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className={cn('font-semibold', h.action === 'submit' ? 'text-ready' : 'text-muted-foreground')}>
                    {h.action === 'submit' ? 'ส่งยืนยัน' : 'บันทึกฉบับร่าง'}
                  </span>
                  <span className="text-xs text-muted-foreground">{thaiDateTime(h.at)} · {h.by}</span>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {h.snapshot.cannotParticipate
                    ? 'ไม่สามารถเข้าร่วมได้'
                    : h.snapshot.days.map((d) => `${Number(d.date.slice(8))}: ${d.available ? RESOURCES.filter((r) => planFor(round, unit, r.key) > 0).map((r) => `${SHORT[r.key]} ${effective(d, r.key)}`).join('/') : 'ไม่พร้อม'}`).join(' · ')}
                </div>
              </li>
            ))}
          </ol>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function PlanSummary({ round, unit, form }: { round: Round; unit: UnitCode; form: UnitResponse }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>สรุปตามแผน · รอบที่ {round.id} ({roundDateRange(round)})</CardTitle>
        <CardDescription>{round.commodity} · จ.{Array.from(new Set(round.days.map((d) => d.province))).join(', ')}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="data-table">
            <thead>
              <tr>
                <th>รายการ</th>
                <th className="text-right">ตามแผน (ต่อวัน)</th>
                <th className="text-right">พร้อมจริง (วันต่ำสุด)</th>
                <th className="text-right">ขาด</th>
              </tr>
            </thead>
            <tbody>
              {RESOURCES.map((r) => {
                const plan = planFor(round, unit, r.key)
                const vals = form.days.map((d) => (d.available && !form.cannotParticipate ? d[r.key] : 0))
                const filled = vals.every((v) => v !== null)
                const min = filled ? Math.min(...(vals as number[])) : null
                return (
                  <tr key={r.key} className={plan === 0 ? 'text-muted-foreground' : ''}>
                    <td className="whitespace-nowrap font-medium">{r.label}</td>
                    <td className="text-right tabular">{plan === 0 ? 'ไม่มีในแผน' : `${plan} ${r.unit}`}</td>
                    <td className="text-right tabular">{plan === 0 ? '–' : min === null ? <span className="text-muted-foreground">ยังไม่กรอก</span> : `${min} ${r.unit}`}</td>
                    <td className={cn('text-right tabular font-semibold', min !== null && plan - min > 0 ? 'text-notready' : '')}>
                      {plan === 0 || min === null ? '–' : Math.max(0, plan - min)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}

function NumberField({ label, unitLabel, plan, value, onChange, disabled }: {
  label: string; unitLabel: string; plan: number; value: number | null; onChange: (v: number | null) => void; disabled?: boolean
}) {
  const short = value !== null && value < plan
  return (
    <div className={cn('rounded-lg border p-2', short ? 'border-partial/50 bg-partial-soft/50' : 'border-border')}>
      <div className="mb-1 flex flex-wrap items-center justify-between gap-x-1 text-xs">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">แผน {plan} {unitLabel}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <Button type="button" size="icon" variant="outline" className="hidden shrink-0 sm:inline-flex" disabled={disabled || !value} onClick={() => onChange(Math.max(0, (value ?? 0) - 1))} aria-label="ลด"><Minus /></Button>
        <Input
          type="number"
          inputMode="numeric"
          min={0}
          className="min-w-0 px-1 text-center text-lg font-semibold tabular placeholder:text-xs placeholder:font-normal"
          placeholder="ยังไม่กรอก"
          value={value ?? ''}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value === '' ? null : Math.max(0, Math.floor(Number(e.target.value))))}
        />
        <Button type="button" size="icon" variant="outline" className="hidden shrink-0 sm:inline-flex" disabled={disabled} onClick={() => onChange((value ?? 0) + 1)} aria-label="เพิ่ม"><Plus /></Button>
      </div>
    </div>
  )
}

const SHORT: Record<Resource, string> = { staff: 'จนท.', crane: 'เครน', pickup: 'กระบะ' }
