'use client'

import { CircleAlert, CircleCheck, X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Toaster as SonnerToaster, toast as sonnerToast } from 'sonner'
import { cn } from '@/lib/cn'

/* design-system/components/Toast.md — a 396px `popover` card on `radius-lg` with
   `shadow-lg` and a 3px left edge in the status color. Stacks bottom-right, four at most.
   Success dismisses after 4s; errors stay until dismissed. sonner only positions and
   stacks them — the card itself is rendered here so it matches the spec exactly. */

type Tone = 'success' | 'error'

function ToastCard({
  tone,
  title,
  description,
  onDismiss,
}: {
  tone: Tone
  title: string
  description?: string
  onDismiss: () => void
}) {
  const t = useTranslations('common')
  const Icon = tone === 'success' ? CircleCheck : CircleAlert

  return (
    <div
      className={cn(
        'flex w-full gap-3 rounded-lg border border-l-[3px] border-border bg-popover p-3.5 text-popover-foreground shadow-lg sm:w-99',
        tone === 'success' ? 'border-l-success' : 'border-l-danger',
      )}
    >
      <Icon
        className={cn('mt-px size-4.5 shrink-0', tone === 'success' ? 'text-success' : 'text-danger')}
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1">
        <p className="text-body font-medium">{title}</p>
        {description ? <p className="mt-0.5 text-body-sm text-muted-foreground">{description}</p> : null}
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label={t('dismiss')}
        className="-m-1 inline-flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:shadow-focus focus-visible:outline-none"
      >
        <X className="size-icon" aria-hidden="true" />
      </button>
    </div>
  )
}

function show(tone: Tone, title: string, description?: string) {
  return sonnerToast.custom(
    (id) => (
      <ToastCard tone={tone} title={title} description={description} onDismiss={() => sonnerToast.dismiss(id)} />
    ),
    { duration: tone === 'success' ? 4000 : Infinity },
  )
}

/** Titles are past tense and name what happened: `Company created`, `Couldn't update the plan`. */
export const toast = {
  success: (title: string, description?: string) => show('success', title, description),
  error: (title: string, description?: string) => show('error', title, description),
}

export function Toaster() {
  return <SonnerToaster position="bottom-right" visibleToasts={4} expand gap={8} />
}
