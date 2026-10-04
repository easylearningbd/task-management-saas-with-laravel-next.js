'use client'

import * as React from 'react'
import { PanelLeft, Moon, Globe, ChevronDown } from 'lucide-react'
import { Avatar } from '@/components/ui/primitives'

/* The Super Admin top bar: breadcrumb on the left, theme / language / user on the right.
   Built from existing tokens — the design system documents topbar-height but ships no
   TopBar component. */

export function Topbar({
  crumbs,
  onToggleSidebar,
  onToggleTheme,
}: {
  crumbs: string[]
  onToggleSidebar: () => void
  onToggleTheme: () => void
}) {
  return (
    <header className="sticky top-0 z-20 flex h-topbar shrink-0 items-center gap-3 border-b border-border bg-card px-4 md:px-6 xl:px-12">
      <button
        onClick={onToggleSidebar}
        aria-label="Toggle sidebar"
        className="inline-flex size-control-sm shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:border focus-visible:border-ring focus-visible:shadow-focus focus-visible:outline-none"
      >
        <PanelLeft className="size-icon-lg" strokeWidth={1.75} />
      </button>

      <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-2 text-body">
        {crumbs.map((crumb, i) => (
          <React.Fragment key={crumb}>
            {i > 0 ? <span className="text-muted-foreground">/</span> : null}
            <span
              className={
                i === crumbs.length - 1 ? 'truncate font-medium text-foreground' : 'truncate text-muted-foreground'
              }
            >
              {crumb}
            </span>
          </React.Fragment>
        ))}
      </nav>

      <div className="ml-auto flex shrink-0 items-center gap-2 md:gap-3">
        <button
          onClick={onToggleTheme}
          aria-label="Toggle dark mode"
          className="inline-flex size-control items-center justify-center rounded-lg border border-border bg-card text-muted-foreground shadow-sm transition-colors hover:bg-accent hover:text-foreground focus-visible:border-ring focus-visible:shadow-focus focus-visible:outline-none"
        >
          <Moon className="size-icon-lg" strokeWidth={1.75} />
        </button>

        <button className="hidden h-control items-center gap-2 rounded-lg border border-border bg-card px-3 text-body shadow-sm transition-colors hover:bg-accent focus-visible:border-ring focus-visible:shadow-focus focus-visible:outline-none sm:inline-flex">
          <Globe className="size-icon text-muted-foreground" />
          <span>English</span>
          <span aria-hidden className="text-[15px] leading-none">🇬🇧</span>
        </button>

        <button className="flex items-center gap-2.5 rounded-lg p-0.5 pr-1 transition-colors hover:bg-accent focus-visible:border focus-visible:border-ring focus-visible:shadow-focus focus-visible:outline-none">
          <Avatar initials="SA" tone="violet" />
          <span className="hidden text-left md:block">
            <span className="block text-title-row leading-tight">Super Admin</span>
            <span className="block text-body-sm leading-tight text-muted-foreground">
              superadmin@example.com
            </span>
          </span>
          <ChevronDown className="size-icon shrink-0 text-muted-foreground" />
        </button>
      </div>
    </header>
  )
}
