import { NavLink, Outlet } from 'react-router-dom'
import { LayoutDashboard, ClipboardEdit, CalendarDays, Presentation, FileBarChart, Settings, LogOut, FlaskConical, Database, AlertCircle } from 'lucide-react'
import { useApp } from '@/lib/app-context'
import { unitByCode } from '@/data/plan'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

const ROLE_LABEL = { admin: 'ผู้ดูแลระบบ', unit_officer: 'เจ้าหน้าที่หน่วยงาน', executive: 'ผู้บริหาร (ดูอย่างเดียว)' }

export function Layout() {
  const { user, repo, setUser, error } = useApp()
  const nav = [
    { to: '/', label: 'แดชบอร์ด', icon: LayoutDashboard, show: true },
    { to: '/survey', label: 'กรอกความพร้อม', icon: ClipboardEdit, show: user?.role !== 'executive' },
    { to: '/daily', label: 'รายวัน', icon: CalendarDays, show: true },
    { to: '/meeting', label: 'ประชุม', icon: Presentation, show: true },
    { to: '/reports', label: 'รายงาน', icon: FileBarChart, show: true },
    { to: '/admin', label: 'จัดการแผน', icon: Settings, show: user?.role === 'admin' },
  ].filter((n) => n.show)

  return (
    <div className="min-h-dvh pb-20 sm:pb-8">
      {repo.mode === 'demo' ? (
        <div className="no-print flex items-center justify-center gap-2 bg-accent px-3 py-1.5 text-center text-xs font-semibold text-[#3b2a00] sm:text-sm">
          <FlaskConical className="size-4 shrink-0" />
          โหมดสาธิต — ข้อมูลเก็บเฉพาะในเบราว์เซอร์เครื่องนี้ ยังไม่ได้บันทึกเข้าฐานข้อมูลกลาง
        </div>
      ) : (
        <div className="no-print hidden items-center justify-center gap-1.5 bg-primary/95 px-3 py-1 text-xs text-white/80 sm:flex">
          <Database className="size-3.5" /> เชื่อมต่อฐานข้อมูลกลาง (Supabase) — อัปเดตอัตโนมัติ
        </div>
      )}
      <header className="no-print sticky top-0 z-40 border-b border-border bg-primary text-primary-foreground">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2.5">
          <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-white/10">
            <img src="./favicon.svg" alt="" className="size-7" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold sm:text-base">ความพร้อมตรวจสอบเครื่องชั่งตวงวัดสินค้าเกษตร ภาคใต้ 2570</div>
            <div className="truncate text-xs text-white/70">ศูนย์ชั่งตวงวัดภาคใต้ (สุราษฎร์ธานี) · กองชั่งตวงวัด กรมการค้าภายใน</div>
          </div>
          <div className="hidden text-right text-xs leading-tight md:block">
            <div className="font-semibold">{user?.displayName}</div>
            <div className="text-white/70">
              {user && ROLE_LABEL[user.role]}
              {user?.unit && user.role === 'unit_officer' ? ` · ${unitByCode(user.unit).short}` : ''}
            </div>
          </div>
          <Button
            size="icon"
            variant="ghost"
            className="text-white hover:bg-white/10"
            title="ออกจากระบบ"
            onClick={async () => {
              await repo.signOut()
              setUser(null)
            }}
          >
            <LogOut />
          </Button>
        </div>
        <nav className="mx-auto hidden max-w-7xl gap-1 px-3 sm:flex">
          {nav.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.to === '/'}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-1.5 rounded-t-lg px-3.5 py-2 text-sm font-medium text-white/75 hover:text-white',
                  isActive && 'bg-background text-primary hover:text-primary',
                )
              }
            >
              <n.icon className="size-4" />
              {n.label}
            </NavLink>
          ))}
        </nav>
      </header>

      {error && (
        <div className="mx-auto mt-3 flex max-w-7xl items-center gap-2 rounded-lg border border-notready/30 bg-notready-soft px-4 py-2 text-sm text-notready">
          <AlertCircle className="size-4" /> {error}
        </div>
      )}

      <main className="mx-auto max-w-7xl px-3 py-4 sm:px-4 sm:py-6">
        <Outlet />
      </main>

      {/* แถบเมนูล่างสำหรับ iPhone */}
      <nav className="no-print fixed inset-x-0 bottom-0 z-40 grid border-t border-border bg-card pb-[env(safe-area-inset-bottom)] sm:hidden"
        style={{ gridTemplateColumns: `repeat(${nav.length}, minmax(0,1fr))` }}>
        {nav.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.to === '/'}
            className={({ isActive }) =>
              cn('flex flex-col items-center gap-0.5 py-2 text-[11px] text-muted-foreground', isActive && 'font-semibold text-primary')
            }
          >
            <n.icon className="size-5" />
            <span className="truncate">{n.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
