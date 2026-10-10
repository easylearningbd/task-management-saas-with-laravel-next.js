'use client'

import * as React from 'react'
import Link from 'next/link'
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

type Crumb = { label: string; href?: string }

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

  // A menu page other than the dashboard: "Dashboard › [Parent ›] Page" (the Clients screenshot:
  // "Dashboard › Clients"), the first step linking home. The dashboard itself, and a page outside
  // the menu (Profile Settings), show a single title.
  // A record page below a menu page ("/projects/6"): the menu page links back and the record's
  // name (usePageCrumb) is the last step — "Dashboard › Projects › Enterprise Digital
  // Transformation"; "Details" until the page provides the name.
  const home: Crumb = { label: t('nav.dashboard'), href: '/dashboard' }
  const below = active !== undefined && pathname !== active.leaf.href
  const crumbs: Crumb[] = active
    ? [
        ...(active.leaf.href === '/dashboard' ? [] : [home]),
        ...(active.parent ? [{ label: t(`nav.${active.parent.labelKey}`) }] : []),
        ...(below
          ? [{ label: t(`nav.${active.leaf.labelKey}`), href: active.leaf.href }, { label: pageLabel ?? t('recordCrumb') }]
          : [{ label: pageLabel ?? t(`nav.${active.leaf.labelKey}`) }]),
      ]
    : pageLabel
      ? [{ label: pageLabel }]
      : pageTitle
        ? [{ label: tShell(`nav.${pageTitle}`) }]
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
              <li key={crumb.label} className={cn('flex min-w-0 items-center gap-2', !last && 'max-sm:hidden')}>
                {index > 0 ? (
                  <ChevronRight className={cn('size-icon shrink-0 text-muted-foreground', last && 'max-sm:hidden')} aria-hidden="true" />
                ) : null}
                {crumb.href && !last ? (
                  <Link
                    href={crumb.href}
                    className="truncate rounded-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:shadow-focus focus-visible:outline-none"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span
                    aria-current={last ? 'page' : undefined}
                    className={cn('truncate', last ? 'font-medium text-foreground' : 'text-muted-foreground')}
                  >
                    {crumb.label}
                  </span>
                )}
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
