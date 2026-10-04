'use client'

import * as React from 'react'
import { Sidebar } from '@/components/layout/sidebar'
import { Topbar } from '@/components/layout/topbar'
import { useMe } from '@/features/auth/api'
import type { User } from '@/features/auth/types'
import { HOME, LOGIN } from '@/lib/routes'

/* The authenticated frame for both roles: sidebar + top bar + page body
   (ported from the dashboard designs' app-shell.tsx). The user comes from the server-side
   layout guard, so the shell never renders for a guest and never flashes the login page. */
export function AppShell({ user, children }: { user: User; children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = React.useState(false)

  useSessionWatch(user)

  React.useEffect(() => {
    if (!sidebarOpen) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSidebarOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [sidebarOpen])

  return (
    <div className="flex min-h-svh bg-background">
      <Sidebar role={user.role} open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar user={user} sidebarOpen={sidebarOpen} onToggleSidebar={() => setSidebarOpen((open) => !open)} />
        <main className="flex-1 px-4 pt-4 pb-8 md:px-6 md:pb-10 xl:px-12 xl:pb-12">{children}</main>
      </div>
    </div>
  )
}

/**
 * Re-checks the session in the browser. The server guard already ran for this render, but a
 * page restored from the back/forward cache or the HTTP cache after logout never reaches the
 * server — so confirm with /api/v1/me on mount and on every bfcache restore, and leave with a
 * full navigation if the session is gone or belongs to the other role.
 */
function useSessionWatch(user: User) {
  const me = useMe({ initialData: user, alwaysRefetchOnMount: true })

  React.useEffect(() => {
    if (!me.isFetchedAfterMount) return
    if (me.data === null) window.location.replace(LOGIN[user.role])
    else if (me.data && me.data.role !== user.role) window.location.replace(HOME[me.data.role])
  }, [me.data, me.isFetchedAfterMount, user.role])

  React.useEffect(() => {
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) window.location.reload() // let the proxy + server guard decide again
    }
    window.addEventListener('pageshow', onPageShow)
    return () => window.removeEventListener('pageshow', onPageShow)
  }, [])
}

/** Page title + subtitle row (from the dashboard designs' PageHeader). */
export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-title-page">{title}</h1>
        {subtitle ? <p className="mt-1 text-caption font-normal text-muted-foreground">{subtitle}</p> : null}
      </div>
      {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
    </div>
  )
}
