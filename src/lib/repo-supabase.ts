import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type {
  Allocation, AppUser, HistoryEntry, MeetingDecision, PlanIssue, Round, UnitCode, UnitResponse,
} from './types'
import type { Repo } from './repo'

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>

const URL = import.meta.env.VITE_SUPABASE_URL as string | undefined
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const supabaseConfigured = !!(URL && KEY && !URL.includes('xxxx'))
let client: SupabaseClient | null = null
const sb = () => (client ??= createClient(URL!, KEY!))

function check<T>(res: { data: T; error: any }): T {
  if (res.error) throw new Error(res.error.message)
  return res.data
}

const toUser = (p: Row, email?: string): AppUser => ({
  id: p.id, displayName: p.display_name || email || 'ผู้ใช้', role: p.role, unit: p.unit_code, email,
})

const toResponse = (r: Row): UnitResponse => ({
  roundId: r.round_id,
  unit: r.unit_code,
  status: r.status,
  cannotParticipate: r.cannot_participate,
  coordinatorName: r.coordinator_name ?? '',
  coordinatorPhone: r.coordinator_phone ?? '',
  notes: r.notes ?? '',
  problems: r.problems ?? '',
  constraintUnresolved: r.constraint_unresolved,
  needsSupport: r.needs_support,
  supportStaff: r.support_staff,
  supportCrane: r.support_crane,
  supportPickup: r.support_pickup,
  supportDetail: r.support_detail ?? '',
  days: r.days ?? [],
  updatedAt: r.updated_at,
  updatedBy: r.updated_by_name ?? '',
  submittedAt: r.submitted_at ?? undefined,
})

export const supabaseRepo: Repo = {
  mode: 'supabase',
  async currentUser() {
    const { data } = await sb().auth.getUser()
    if (!data.user) return null
    const p = check(await sb().from('profiles').select('*').eq('id', data.user.id).maybeSingle())
    if (!p) throw new Error('บัญชีนี้ยังไม่มีโปรไฟล์ในระบบ โปรดติดต่อผู้ดูแลระบบ')
    return toUser(p, data.user.email ?? undefined)
  },
  async signIn(email, password) {
    const { error } = await sb().auth.signInWithPassword({ email, password })
    if (error) throw new Error(error.message === 'Invalid login credentials' ? 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' : error.message)
    const u = await this.currentUser()
    if (!u) throw new Error('เข้าสู่ระบบไม่สำเร็จ')
    return u
  },
  async signOut() {
    await sb().auth.signOut()
  },
  async loadAll() {
    const [rounds, days, allocs, issues, responses, decisions] = await Promise.all([
      sb().from('rounds').select('*').order('id'),
      sb().from('plan_days').select('*').order('date'),
      sb().from('plan_allocations').select('*'),
      sb().from('plan_issues').select('*'),
      sb().from('responses').select('*'),
      sb().from('meeting_decisions').select('*').order('created_at'),
    ])
    const rr = check(rounds) as Row[]
    const dd = check(days) as Row[]
    const aa = check(allocs) as Row[]
    return {
      rounds: rr.map<Round>((r) => ({
        id: r.id,
        month: r.month,
        target: r.target,
        commodity: r.commodity,
        headerTotals: { staff: r.header_staff, crane: r.header_crane, pickup: r.header_pickup },
        days: dd.filter((d) => d.round_id === r.id).map((d) => ({ date: d.date, province: d.province, note: d.note ?? undefined })),
        allocations: Object.fromEntries(
          aa.filter((a) => a.round_id === r.id).map((a) => [a.unit_code, { staff: a.staff, crane: a.crane, pickup: a.pickup }]),
        ) as Allocation,
      })),
      issues: (check(issues) as Row[]).map<PlanIssue>((i) => ({
        id: i.id, roundId: i.round_id, resource: i.resource ?? undefined, title: i.title, detail: i.detail,
        sourceValues: i.source_values ?? undefined, blocking: i.blocking, status: i.status,
        resolution: i.resolution ?? undefined, resolvedBy: i.resolved_by_name ?? undefined, resolvedAt: i.resolved_at ?? undefined,
      })),
      responses: (check(responses) as Row[]).map(toResponse),
      decisions: (check(decisions) as Row[]).map<MeetingDecision>((d) => ({
        id: d.id, roundId: d.round_id, topic: d.topic ?? '', decision: d.decision, allocation: d.allocation ?? '',
        owner: d.owner ?? '', dueDate: d.due_date ?? '', createdAt: d.created_at, createdBy: d.created_by_name ?? '',
      })),
    }
  },
  async saveResponse(resp, action, user) {
    // สิทธิ์จริงบังคับด้วย RLS ในฐานข้อมูล; updated_at / updated_by / history ตั้งโดย trigger ฝั่งเซิร์ฟเวอร์
    const row = {
      round_id: resp.roundId,
      unit_code: resp.unit,
      status: action === 'submit' ? 'submitted' : 'draft',
      cannot_participate: resp.cannotParticipate,
      coordinator_name: resp.coordinatorName,
      coordinator_phone: resp.coordinatorPhone,
      notes: resp.notes,
      problems: resp.problems,
      constraint_unresolved: resp.constraintUnresolved,
      needs_support: resp.needsSupport,
      support_staff: resp.supportStaff,
      support_crane: resp.supportCrane,
      support_pickup: resp.supportPickup,
      support_detail: resp.supportDetail,
      days: resp.days,
      updated_by_name: user.displayName,
    }
    const data = check(await sb().from('responses').upsert(row, { onConflict: 'round_id,unit_code' }).select().single())
    return toResponse(data as Row)
  },
  async history(roundId, unit) {
    const rows = check(
      await sb().from('response_history').select('*').eq('round_id', roundId).eq('unit_code', unit).order('at', { ascending: false }),
    ) as Row[]
    return rows.map<HistoryEntry>((h) => ({
      id: String(h.id), roundId: h.round_id, unit: h.unit_code as UnitCode, action: h.action, at: h.at,
      by: h.by_name ?? '', snapshot: toResponse(h.snapshot),
    }))
  },
  async addDecision(d, user) {
    check(await sb().from('meeting_decisions').insert({
      round_id: d.roundId, topic: d.topic, decision: d.decision, allocation: d.allocation, owner: d.owner,
      due_date: d.dueDate || null, created_by_name: user.displayName,
    }))
  },
  async deleteDecision(id) {
    check(await sb().from('meeting_decisions').delete().eq('id', id))
  },
  async updateRoundPlan(round) {
    check(await sb().from('rounds').update({
      header_staff: round.headerTotals.staff, header_crane: round.headerTotals.crane, header_pickup: round.headerTotals.pickup,
    }).eq('id', round.id))
    const rows = Object.entries(round.allocations).map(([unit_code, a]) => ({ round_id: round.id, unit_code, ...a }))
    check(await sb().from('plan_allocations').upsert(rows, { onConflict: 'round_id,unit_code' }))
  },
  async resolveIssue(id, resolution, reopen, user) {
    check(await sb().from('plan_issues').update(
      reopen
        ? { status: 'open', resolution: null, resolved_at: null, resolved_by_name: null }
        : { status: 'resolved', resolution, resolved_at: new Date().toISOString(), resolved_by_name: user.displayName },
    ).eq('id', id))
  },
  async listUsers() {
    const rows = check(await sb().from('profiles').select('*').order('display_name')) as Row[]
    return rows.map((p) => toUser(p, p.email))
  },
  async updateUser(u) {
    check(await sb().from('profiles').update({ display_name: u.displayName, role: u.role, unit_code: u.unit }).eq('id', u.id))
  },
  subscribe(onChange) {
    const ch = sb()
      .channel('readiness')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'responses' }, onChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'meeting_decisions' }, onChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'plan_issues' }, onChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'plan_allocations' }, onChange)
      .subscribe()
    return () => { void sb().removeChannel(ch) }
  },
}
