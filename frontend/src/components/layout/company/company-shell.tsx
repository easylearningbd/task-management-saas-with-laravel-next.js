'use client'

import * as React from 'react'
import { useSessionWatch } from '@/components/layout/app-shell'
import { CompanyPlanCard } from '@/components/layout/company/plan-card'
import { CompanySidebar } from '@/components/layout/company/sidebar'
import { CompanyTopbar } from '@/components/layout/company/topbar'
import { ImpersonationBanner } from '@/components/layout/impersonation-banner'
import { PageCrumbProvider } from '@/components/layout/page-crumb'
import type { User } from '@/features/auth/types'

/* The company frame: sidebar + top bar + page body (design/user-dashboard/components/shell/
   app-shell.tsx). Its own component tree — the Super Admin AppShell is not used here, so the
   two shells can change independently. It keeps AppShell's session watch (re-check /me on
   mount and on back/forward restores) and the impersonation banner.
   Sidebar toggle: below `lg` it opens / closes the drawer; from `lg` it hides / shows the
   sidebar (the design has no icon-rail state, so collapsing hides it fully). The design's
   floating Help button is left out until a help page exists (Phase 0, decision 8). */

const DESKTOP = '(min-width: 64rem)' // Tailwind `lg`

function subscribeDesktop(onChange: () => void) {
  const query = window.matchMedia(DESKTOP)
  query.addEventListener('change', onChange)
  return () => query.removeEventListener('change', onChange)
}
const isDesktop = () => window.matchMedia(DESKTOP).matches

export function CompanyShell({ user, children }: { user: User; children: React.ReactNode }) {
  const [drawerOpen, setDrawerOpen] = React.useState(false)
  const [collapsed, setCollapsed] = React.useState(false)
  const current = useSessionWatch(user)

  React.useEffect(() => {
    if (!drawerOpen) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setDrawerOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [drawerOpen])

  const desktop = React.useSyncExternalStore(subscribeDesktop, isDesktop, () => false)
  // The drawer only exists below `lg`; it never stays open behind a desktop layout.
  const drawerShown = drawerOpen && !desktop

  const toggle = () => (desktop ? setCollapsed((value) => !value) : setDrawerOpen((value) => !value))

  return (
    <PageCrumbProvider>
      <div className="flex min-h-svh bg-background">
        <CompanySidebar
          open={drawerShown}
          collapsed={collapsed}
          onClose={() => setDrawerOpen(false)}
          footer={<CompanyPlanCard user={current} />}
        />
        <div className="flex min-w-0 flex-1 flex-col">
          {current.is_impersonating ? <ImpersonationBanner companyName={current.name} /> : null}
          <CompanyTopbar user={current} sidebarVisible={desktop ? !collapsed : drawerShown} onToggleSidebar={toggle} />
          <main className="flex-1 px-4 pt-4 pb-8 md:px-6 md:pb-10 xl:px-12 xl:pb-12">{children}</main>
        </div>
      </div>
    </PageCrumbProvider>
  )
}
