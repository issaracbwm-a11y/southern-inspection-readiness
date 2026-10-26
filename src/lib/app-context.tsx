import * as React from 'react'
import type { AppData, Repo } from './repo'
import type { AppUser } from './types'
import { demoRepo } from './repo-demo'
import { supabaseConfigured, supabaseRepo } from './repo-supabase'
import { roundSummary, type RoundSummary } from './readiness'

interface Toast { id: number; kind: 'ok' | 'err' | 'info'; text: string }

interface Ctx {
  repo: Repo
  user: AppUser | null
  setUser: (u: AppUser | null) => void
  data: AppData | null
  summaries: RoundSummary[]
  loading: boolean
  error: string | null
  reload: () => Promise<void>
  toast: (text: string, kind?: Toast['kind']) => void
}

const AppCtx = React.createContext<Ctx | null>(null)
export const useApp = () => {
  const c = React.useContext(AppCtx)
  if (!c) throw new Error('useApp outside provider')
  return c
}

export const repo: Repo = supabaseConfigured ? supabaseRepo : demoRepo

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<AppUser | null>(null)
  const [data, setData] = React.useState<AppData | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [toasts, setToasts] = React.useState<Toast[]>([])

  const toast = React.useCallback((text: string, kind: Toast['kind'] = 'ok') => {
    const id = Date.now() + Math.random()
    setToasts((t) => [...t, { id, kind, text }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000)
  }, [])

  const reload = React.useCallback(async () => {
    try {
      setData(await repo.loadAll())
      setError(null)
    } catch (e) {
      setError((e as Error).message)
    }
  }, [])

  React.useEffect(() => {
    ;(async () => {
      try {
        setUser(await repo.currentUser())
      } catch (e) {
        setError((e as Error).message)
      }
      setLoading(false)
    })()
  }, [])

  React.useEffect(() => {
    if (!user) return
    void reload()
    return repo.subscribe(() => void reload())
  }, [user, reload])

  const summaries = React.useMemo(
    () => (data ? data.rounds.map((r) => roundSummary(r, data.responses, data.issues)) : []),
    [data],
  )

  return (
    <AppCtx.Provider value={{ repo, user, setUser, data, summaries, loading, error, reload, toast }}>
      {children}
      <div className="no-print pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex flex-col items-center gap-2 px-4 sm:bottom-6">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={
              'pointer-events-auto max-w-md rounded-lg px-4 py-2.5 text-sm font-medium text-white shadow-lg ' +
              (t.kind === 'ok' ? 'bg-ready' : t.kind === 'err' ? 'bg-notready' : 'bg-primary')
            }
          >
            {t.text}
          </div>
        ))}
      </div>
    </AppCtx.Provider>
  )
}
