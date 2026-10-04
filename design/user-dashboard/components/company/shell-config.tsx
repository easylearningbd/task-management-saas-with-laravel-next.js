'use client'

import * as React from 'react'
import {
  LayoutDashboard, Calendar, SquareCheck, PanelsTopLeft, CalendarClock, CalendarDays,
  Users, DollarSign, Video, Play,
} from 'lucide-react'
import { type SidebarSection } from '@/components/shell/sidebar'
import { Avatar } from '@/components/ui/primitives'

export const COMPANY_SECTIONS: SidebarSection[] = [
  { heading: 'Overview', items: [
    { label: 'Dashboard', icon: LayoutDashboard, active: true },
    { label: 'Calendar', icon: Calendar },
  ]},
  { heading: 'Project Management', items: [
    { label: 'Tasks', icon: SquareCheck },
    { label: 'Projects', icon: PanelsTopLeft },
    { label: 'Time Tracker', icon: CalendarClock },
    { label: 'Timesheets', icon: CalendarDays },
  ]},
  { heading: 'Client Relations', items: [{ label: 'Clients', icon: Users }] },
  { heading: 'Financial Management', items: [{ label: 'Financial', icon: DollarSign, expandable: true }] },
  { heading: 'Meetings', items: [{ label: 'Zoom Meetings', icon: Video }] },
]

export const COMPANY_USER = { name: 'Company', email: 'company@example.com', initials: 'CO' }

/** The plan card pinned under System Configuration. */
export function CompanyPlanCard() {
  return (
    <>
      <p className="px-2 pt-5 pb-1.5 text-caption font-semibold text-sidebar-muted">System Configuration</p>
      <div className="flex items-center gap-2.5 rounded-lg bg-accent p-2.5">
        <Avatar initials="CO" tone="violet" className="size-9" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-title-row">Company</span>
          <span className="block text-caption font-normal text-muted-foreground">Pro</span>
        </span>
        <button className="inline-flex h-7 shrink-0 items-center rounded-lg border border-border bg-card px-2.5 text-[12px] font-medium shadow-sm transition-colors hover:bg-accent focus-visible:border-ring focus-visible:shadow-focus focus-visible:outline-none">
          Upgrade
        </button>
      </div>
    </>
  )
}

/** The Start button in the Company top bar. */
export function StartButton() {
  return (
    <button className="inline-flex h-control items-center gap-2 rounded-lg border border-border bg-card px-3 text-body font-medium shadow-sm transition-colors hover:bg-accent focus-visible:border-ring focus-visible:shadow-focus focus-visible:outline-none">
      <Play className="size-icon fill-primary text-primary" strokeWidth={1.75} />
      Start
    </button>
  )
}
