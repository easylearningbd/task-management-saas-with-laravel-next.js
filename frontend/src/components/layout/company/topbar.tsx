'use client'

import * as React from 'react'
import { ChevronRight, PanelLeft } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { activeCompanyEntry, COMPANY_PAGE_TITLES } from '@/components/layout/company/nav'
import { StartTimerButton } from '@/components/layout/company/start-timer-button'
import { usePageCrumbLabel } from '@/components/layout/page-crumb'
import { LanguageSwitcher } from '@/components/ui/language-switcher'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { UserMenu } from '@/features/auth/components/user-menu'
import type { User } from '@/features/auth/types'
import { cn } from '@/lib/cn'

/* The company top bar — design/user-dashboard/components/shell/topbar.tsx: `topbar-height`,
   `card` ground, bottom border; the sidebar toggle (every width: drawer below `lg`, hide /
   show from `lg`) and the breadcrumb on the left; Start, theme, language and the user menu on
   the right (PRD §4). The breadcrumb follows the company tree — "Financial › Invoices" for a
   sub-page — with › separators as on the admin side. Separate from the Super Admin top bar. */
export function CompanyTopbar({
  user,
  sidebarVisible,
  onToggleSidebar,
}: {
  user: User
  /** Whether the sidebar is showing at the current width (drives aria-expanded). */
  sidebarVisible: boolean
  onToggleSidebar: () => void
}) {
  const t = useTranslations('companyShell')
  const tShell = useTranslations('shell')
  const pathname = usePathname()
  const pageLabel = usePageCrumbLabel()
  const active = activeCompanyEntry(pathname)
  const pageTitle = COMPANY_PAGE_TITLES[pathname]

  // A menu page: "Parent › Page"; a page outside the menu (Profile Settings): its single title.
  const crumbs = active
    ? [...(active.parent ? [t(`nav.${active.parent.labelKey}`)] : []), pageLabel ?? t(`nav.${active.leaf.labelKey}`)]
    : pageLabel
      ? [pageLabel]
      : pageTitle
        ? [tShell(`nav.${pageTitle}`)]
        : []

  return (
    <header className="sticky top-0 z-20 flex h-topbar shrink-0 items-center gap-3 border-b border-border bg-card px-4 md:px-6 xl:px-12">
      <button
        type="button"
        onClick={onToggleSidebar}
        aria-label={tShell('toggleSidebar')}
        aria-controls="app-sidebar"
        aria-expanded={sidebarVisible}
        className="inline-flex size-control-sm shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:border focus-visible:border-ring focus-visible:shadow-focus focus-visible:outline-none"
      >
        <PanelLeft className="size-icon-lg" strokeWidth={1.75} aria-hidden="true" />
      </button>

      <nav aria-label={tShell('breadcrumb')} className="min-w-0 text-body">
        <ol className="flex min-w-0 items-center gap-2">
          {crumbs.map((crumb, index) => {
            const last = index === crumbs.length - 1
            return (
              <li key={crumb} className={cn('flex min-w-0 items-center gap-2', !last && 'max-sm:hidden')}>
                {index > 0 ? (
                  <ChevronRight className={cn('size-icon shrink-0 text-muted-foreground', last && 'max-sm:hidden')} aria-hidden="true" />
                ) : null}
                <span
                  aria-current={last ? 'page' : undefined}
                  className={cn('truncate', last ? 'font-medium text-foreground' : 'text-muted-foreground')}
                >
                  {crumb}
                </span>
              </li>
            )
          })}
        </ol>
      </nav>

      <div className="ml-auto flex shrink-0 items-center gap-2 md:gap-3">
        <StartTimerButton />
        <ThemeToggle />
        <LanguageSwitcher className="max-sm:hidden" />
        <UserMenu user={user} />
      </div>
    </header>
  )
}
