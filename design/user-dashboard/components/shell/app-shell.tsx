'use client'

import * as React from 'react'
import { LifeBuoy } from 'lucide-react'
import { Sidebar, type SidebarSection } from '@/components/shell/sidebar'
import { Topbar } from '@/components/shell/topbar'

/* The Super Admin shell: sidebar + topbar + content + help button. */
export function AppShell({
  crumbs,
  children,
  sections,
  sidebarFooter,
  user,
  topbarActions,
}: {
  crumbs: string[]
  children: React.ReactNode
  sections?: SidebarSection[]
  sidebarFooter?: React.ReactNode
  user?: { name: string; email: string; initials: string }
  topbarActions?: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = React.useState(false)

  const toggleTheme = () => {
    document.documentElement.classList.toggle('dark')
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} sections={sections} footer={sidebarFooter} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          crumbs={crumbs}
          onToggleSidebar={() => setSidebarOpen((v) => !v)}
          onToggleTheme={toggleTheme}
          user={user}
          actions={topbarActions}
        />
        <main className="flex-1 px-4 pt-4 pb-8 md:px-6 md:pb-10 xl:px-12 xl:pb-12">{children}</main>
      </div>

      <button
        aria-label="Help and support"
        className="fixed right-5 bottom-5 z-30 inline-flex size-fab items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md transition-colors hover:bg-primary-hover focus-visible:shadow-focus focus-visible:outline-none md:right-7 md:bottom-7"
      >
        <LifeBuoy className="size-6" strokeWidth={1.75} />
      </button>
    </div>
  )
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string
  subtitle?: string
  action?: React.ReactNode
}) {
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
