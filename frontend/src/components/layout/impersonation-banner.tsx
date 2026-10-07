'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/toast'
import { useStopImpersonating } from '@/features/auth/impersonation'

/* The persistent "viewing as" strip shown while a super admin is logged in as a company
   (CLAUDE.md §6). No design-system spec exists; approved in Companies Phase 3 to reuse the
   Alert's status pair — `warning-soft` ground, `warning` text, `body-sm` — full width above the
   top bar with the shell's own side padding, and an outline `sm` "Back to Admin" button. No
   icon (the brand book has no impersonation glyph). role="status" so it is announced once. */
export function ImpersonationBanner({ companyName }: { companyName: string }) {
  const t = useTranslations('shell.impersonation')
  const stop = useStopImpersonating()
  const busy = stop.isPending || stop.isSuccess

  return (
    <div
      role="status"
      className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 bg-warning-soft px-4 py-2 text-body-sm text-warning md:px-6 xl:px-12"
    >
      <p>
        {t.rich('viewingAs', { company: companyName, strong: (chunks) => <strong className="font-semibold">{chunks}</strong> })}
      </p>
      <Button
        variant="outline"
        size="sm"
        loading={busy}
        onClick={() => stop.mutate(undefined, { onError: () => toast.error(t('failed')) })}
      >
        {t('backToAdmin')}
      </Button>
    </div>
  )
}
