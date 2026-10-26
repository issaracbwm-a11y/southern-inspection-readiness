import { CheckCircle2, AlertTriangle, XCircle, Clock, HelpCircle } from 'lucide-react'
import type { ReadinessStatus } from './types'
import { cn } from './utils'

export const STATUS: Record<ReadinessStatus, { label: string; short: string; cell: string; soft: string; text: string; bar: string; Icon: typeof CheckCircle2 }> = {
  ready: { label: 'พร้อม', short: 'พร้อม', cell: 'bg-ready text-white', soft: 'bg-ready-soft text-ready border-ready/30', text: 'text-ready', bar: 'bg-ready', Icon: CheckCircle2 },
  partial: { label: 'พร้อมบางส่วน', short: 'บางส่วน', cell: 'bg-partial-bar text-[#422006]', soft: 'bg-partial-soft text-partial border-partial/30', text: 'text-partial', bar: 'bg-partial-bar', Icon: AlertTriangle },
  not_ready: { label: 'ไม่พร้อม', short: 'ไม่พร้อม', cell: 'bg-notready text-white', soft: 'bg-notready-soft text-notready border-notready/30', text: 'text-notready', bar: 'bg-notready', Icon: XCircle },
  no_response: { label: 'ยังไม่ตอบ', short: 'ยังไม่ตอบ', cell: 'bg-noresp-soft text-noresp border border-dashed border-noresp-bar', soft: 'bg-noresp-soft text-noresp border-noresp/30', text: 'text-noresp', bar: 'bg-noresp-bar', Icon: Clock },
  plan_pending: { label: 'แผนรอยืนยัน', short: 'แผนรอยืนยัน', cell: 'bg-pending text-white', soft: 'bg-pending-soft text-pending border-pending/30', text: 'text-pending', bar: 'bg-pending', Icon: HelpCircle },
}

export function StatusBadge({ status, className, label }: { status: ReadinessStatus; className?: string; label?: string }) {
  const s = STATUS[status]
  return (
    <span className={cn('inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-semibold', s.soft, className)}>
      <s.Icon className="size-3.5" />
      {label ?? s.label}
    </span>
  )
}

export const pctBarClass = (pct: number) => (pct >= 100 ? 'bg-ready' : pct >= 50 ? 'bg-partial-bar' : 'bg-notready')
