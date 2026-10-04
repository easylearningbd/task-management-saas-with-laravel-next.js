'use client'

import { CircleAlert } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'

/* Catches errors below the root layout — notably the layout guards failing closed when the
   API cannot confirm the session. Nothing protected renders; the user can retry. */
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations('errorPage')

  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-4 px-4 text-center">
      <span className="inline-flex size-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <CircleAlert className="size-icon-lg" aria-hidden="true" />
      </span>
      <div className="flex max-w-md flex-col gap-1">
        <h1 className="text-title-section">{t('title')}</h1>
        <p className="text-body text-muted-foreground">{t('description')}</p>
      </div>
      <Button variant="outline" onClick={reset}>
        {t('retry')}
      </Button>
    </main>
  )
}
