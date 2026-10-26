import * as React from 'react'
import * as D from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

export const Dialog = D.Root
export const DialogTrigger = D.Trigger
export const DialogClose = D.Close

export function DialogContent({ className, children, title, description }: {
  className?: string; children: React.ReactNode; title: React.ReactNode; description?: React.ReactNode
}) {
  return (
    <D.Portal>
      <D.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px] data-[state=open]:animate-in" />
      <D.Content
        className={cn(
          'fixed inset-x-0 bottom-0 z-50 max-h-[92dvh] overflow-y-auto rounded-t-2xl border border-border bg-card p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-xl',
          'sm:inset-auto sm:left-1/2 sm:top-1/2 sm:w-[min(760px,94vw)] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:p-6',
          className,
        )}
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <D.Title className="text-lg font-semibold leading-tight">{title}</D.Title>
            {description ? <D.Description className="mt-1 text-sm text-muted-foreground">{description}</D.Description> : <D.Description className="sr-only">รายละเอียด</D.Description>}
          </div>
          <D.Close className="rounded-md p-1.5 hover:bg-muted" aria-label="ปิด"><X className="size-5" /></D.Close>
        </div>
        {children}
      </D.Content>
    </D.Portal>
  )
}
