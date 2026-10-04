import * as React from 'react'
import { getTranslations } from 'next-intl/server'
import { Card, CardContent } from '@/components/ui/card'
import { LanguageSwitcher } from '@/components/ui/language-switcher'
import { Logo } from '@/components/ui/logo'
import { ThemeToggle } from '@/components/ui/theme-toggle'

/* The frame every auth page shares: language + theme controls top-right (PRD §2.2),
   the TASK wordmark, then one card holding the page's form. Built from Card, Logo and
   the top bar's controls — the design system has no auth page of its own. */
export async function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string
  subtitle: string
  children: React.ReactNode
  /** Rendered under the card, e.g. the "Don't have an account?" link. */
  footer?: React.ReactNode
}) {
  const t = await getTranslations('common')

  return (
    <div className="flex min-h-svh flex-col bg-background px-4">
      <header className="flex justify-end gap-2 py-4">
        <LanguageSwitcher />
        <ThemeToggle />
      </header>

      <main className="flex flex-1 flex-col items-center justify-center pb-16">
        <div className="flex w-full max-w-md flex-col items-center gap-6">
          <Logo label={t('appName')} />

          <Card className="w-full">
            <CardContent className="flex flex-col gap-6">
              <div className="flex flex-col gap-1 text-center">
                <h1 className="text-title-page">{title}</h1>
                <p className="text-body text-muted-foreground">{subtitle}</p>
              </div>
              {children}
            </CardContent>
          </Card>

          {footer ? <div className="text-center text-body text-muted-foreground">{footer}</div> : null}
        </div>
      </main>
    </div>
  )
}
