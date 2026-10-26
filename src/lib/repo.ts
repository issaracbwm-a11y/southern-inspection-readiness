import type {
  AppUser, HistoryEntry, MeetingDecision, PlanIssue, Round, UnitResponse,
} from './types'

export interface AppData {
  rounds: Round[]
  issues: PlanIssue[]
  responses: UnitResponse[]
  decisions: MeetingDecision[]
}

export interface Repo {
  mode: 'demo' | 'supabase'
  currentUser(): Promise<AppUser | null>
  signIn(email: string, password: string): Promise<AppUser>
  signOut(): Promise<void>
  loadAll(): Promise<AppData>
  saveResponse(resp: UnitResponse, action: 'draft' | 'submit', user: AppUser): Promise<UnitResponse>
  history(roundId: number, unit: string): Promise<HistoryEntry[]>
  addDecision(d: Omit<MeetingDecision, 'id' | 'createdAt' | 'createdBy'>, user: AppUser): Promise<void>
  deleteDecision(id: string, user: AppUser): Promise<void>
  updateRoundPlan(round: Round, user: AppUser): Promise<void>
  resolveIssue(id: string, resolution: string, reopen: boolean, user: AppUser): Promise<void>
  listUsers?(): Promise<AppUser[]>
  updateUser?(u: AppUser): Promise<void>
  subscribe(onChange: () => void): () => void
}

export class PermissionError extends Error {}

export function canEditUnit(user: AppUser | null, unit: string): boolean {
  if (!user) return false
  if (user.role === 'admin') return true
  return user.role === 'unit_officer' && user.unit === unit
}

export function assertAdmin(user: AppUser) {
  if (user.role !== 'admin') throw new PermissionError('เฉพาะผู้ดูแลระบบเท่านั้น')
}
