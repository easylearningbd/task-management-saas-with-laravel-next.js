'use client'

import * as React from 'react'
import { Check, Copy } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/toast'
import { Tooltip } from '@/components/ui/tooltip'
import { cn } from '@/lib/cn'

/* Copy a value to the clipboard (the checkout's bank details; later the referral link). Not in the
   design system — the ghost `icon-sm` Button of RowActions with the `Copy` glyph and the shared
   Tooltip ("Copy"). After a copy the glyph turns into a `success` Check and the tooltip / a polite
   live region say "Copied" for 2 s; a failure says "Couldn't copy". Uses the async Clipboard API,
   falling back to a hidden textarea + execCommand where it isn't available.
   `label` names WHAT is copied ("Account number") — the button's accessible name is
   "Copy Account number".
   `variant="button"`: the outline `sm` Button with the glyph and its own text (the invoice page's
   "Copy Link"), and `toastMessage` confirms with a toast as well. */

const RESET_MS = 2000

async function writeClipboard(text: string): Promise<void> {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }
  const area = document.createElement('textarea')
  area.value = text
  area.setAttribute('readonly', '')
  area.style.position = 'fixed'
  area.style.opacity = '0'
  document.body.appendChild(area)
  area.select()
  const ok = document.execCommand('copy')
  area.remove()
  if (!ok) throw new Error('copy failed')
}

export function CopyButton({
  value,
  label,
  variant = 'icon',
  children,
  toastMessage,
  className,
}: {
  value: string
  label: string
  /** `button`: an outline button with the Copy glyph and `children` as its text ("Copy Link"). */
  variant?: 'icon' | 'button'
  children?: React.ReactNode
  /** Also confirm with a toast (success: this text; failure: "Couldn't copy"). */
  toastMessage?: string
  className?: string
}) {
  const t = useTranslations('shared.copy')
  const [state, setState] = React.useState<'idle' | 'copied' | 'failed'>('idle')
  const timer = React.useRef<number | null>(null)

  React.useEffect(() => () => {
    if (timer.current !== null) window.clearTimeout(timer.current)
  }, [])

  const onCopy = async () => {
    try {
      await writeClipboard(value)
      setState('copied')
      if (toastMessage) toast.success(toastMessage)
    } catch {
      setState('failed')
      if (toastMessage) toast.error(t('failed'))
    }
    if (timer.current !== null) window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setState('idle'), RESET_MS)
  }

  const tip = state === 'copied' ? t('copied') : state === 'failed' ? t('failed') : t('copyTip')
  const glyph = state === 'copied' ? <Check className="size-icon" aria-hidden="true" /> : <Copy className="size-icon" aria-hidden="true" />

  if (variant === 'button') {
    return (
      <>
        <Button type="button" variant="outline" size="sm" onClick={onCopy} className={className}>
          {glyph}
          {children}
        </Button>
        <span role="status" aria-live="polite" className="sr-only">
          {state === 'copied' ? t('copiedLabel', { label }) : state === 'failed' ? t('failed') : ''}
        </span>
      </>
    )
  }

  return (
    <>
      <Tooltip content={tip}>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={t('copy', { label })}
          onClick={onCopy}
          className={cn(state === 'copied' && 'text-success hover:text-success', className)}
        >
          {glyph}
        </Button>
      </Tooltip>
      <span role="status" aria-live="polite" className="sr-only">
        {state === 'copied' ? t('copiedLabel', { label }) : state === 'failed' ? t('failed') : ''}
      </span>
    </>
  )
}
