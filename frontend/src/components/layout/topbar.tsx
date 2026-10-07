'use client'

import * as React from 'react'
import Link from 'next/link'
import { ChevronRight, PanelLeft } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { LanguageSwitcher } from '@/components/ui/language-switcher'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { breadcrumbsFor } from '@/components/layout/nav'
import { usePageCrumbLabel } from '@/components/layout/page-crumb'
import { cn } from '@/lib/cn'
import { UserMenu } from '@/features/auth/components/user-menu'
import type { User } from '@/features/auth/types'

/* Ported from the dashboard designs' topbar.tsx: `topbar-height`, `card` ground, bottom
   border; sidebar toggle + breadcrumb on the left; theme, language and the user menu on the
   right. The company "Start" timer button arrives with the Time Tracker module. */
export function Topbar({ user, sidebarOpen, onToggleSidebar }: { user: User; sidebarOpen: boolean; onToggleSidebar: () => void }) {
  const t = useTranslations('shell')
  const pathname = usePathname()
  const crumbs = breadcrumbsFor(user.role, pathname)
  const pageLabel = usePageCrumbLabel()

  return (
    <header className="sticky top-0 z-20 flex h-topbar shrink-0 items-center gap-3 border-b border-border bg-card px-4 md:px-6 xl:px-12">
      <button
        type="button"
        onClick={onToggleSidebar}
        aria-label={t('toggleSidebar')}
        aria-controls="app-sidebar"
        aria-expanded={sidebarOpen}
        className="inline-flex size-control-sm shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:border focus-visible:border-ring focus-visible:shadow-focus focus-visible:outline-none lg:hidden"
      >
        <PanelLeft className="size-icon-lg" strokeWidth={1.75} aria-hidden="true" />
      </button>

      {/* Breadcrumb: earlier steps are muted links (hidden on phones), the last is the page. */}
      <nav aria-label={t('breadcrumb')} className="min-w-0 text-body">
        <ol className="flex min-w-0 items-center gap-2">
          {crumbs.map((crumb, index) => {
            const last = index === crumbs.length - 1
            const label = crumb.dynamic && pageLabel ? pageLabel : t(`nav.${crumb.labelKey}`)
            return (
              <li key={crumb.labelKey} className={cn('flex min-w-0 items-center gap-2', !last && 'max-sm:hidden')}>
                {index > 0 ? (
                  // On phones only the last step shows, so its separator hides too.
                  <ChevronRight
                    className={cn('size-icon shrink-0 text-muted-foreground', last && 'max-sm:hidden')}
                    aria-hidden="true"
                  />
                ) : null}
                {last || !crumb.href ? (
                  <span aria-current={last ? 'page' : undefined} className="truncate font-medium text-foreground">
                    {label}
                  </span>
                ) : (
                  <Link
                    href={crumb.href}
                    className="truncate rounded-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:shadow-focus focus-visible:outline-none"
                  >
                    {label}
                  </Link>
                )}
              </li>
            )
          })}
        </ol>
      </nav>

      <div className="ml-auto flex shrink-0 items-center gap-2 md:gap-3">
        <ThemeToggle />
        <LanguageSwitcher className="max-sm:hidden" />
        <UserMenu user={user} />
      </div>
    </header>
  )
}
