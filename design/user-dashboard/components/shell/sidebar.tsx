'use client'

import * as React from 'react'
import {
  LayoutDashboard, Building2, Image, CreditCard, Tag, DollarSign, Gift, Compass,
  Mail, Settings2, Search, ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/cn'

/* Implements design-system/components/SidebarNav.md */

export type Item = { label: string; icon: React.ElementType; active?: boolean; expandable?: boolean }
export type Section = { heading: string; items: Item[] }

const SECTIONS: Section[] = [
  { heading: 'Overview', items: [{ label: 'Dashboard', icon: LayoutDashboard, active: true }] },
  {
    heading: 'Management',
    items: [
      { label: 'Companies', icon: Building2 },
      { label: 'Media Library', icon: Image },
      { label: 'Plans', icon: CreditCard, expandable: true },
      { label: 'Coupons', icon: Tag },
      { label: 'Currency', icon: DollarSign },
      { label: 'Referral Program', icon: Gift },
      { label: 'Landing Page', icon: Compass, expandable: true },
    ],
  },
  {
    heading: 'System Control',
    items: [
      { label: 'Email Templates', icon: Mail },
      { label: 'Settings', icon: Settings2 },
    ],
  },
]

export type SidebarSection = Section

export function Sidebar({
  open,
  onClose,
  sections = SECTIONS,
  footer,
}: {
  open: boolean
  onClose: () => void
  /** defaults to the Super Admin tree */
  sections?: Section[]
  footer?: React.ReactNode
}) {
  return (
    <>
      {/* scrim, phone only */}
      <div
        onClick={onClose}
        className={cn(
          'fixed inset-0 z-30 bg-overlay lg:hidden',
          open ? 'block' : 'hidden',
        )}
        aria-hidden
      />
      <aside
        className={cn(
          'z-40 flex w-sidebar shrink-0 flex-col border-r border-sidebar-border bg-sidebar',
          'max-lg:fixed max-lg:inset-y-0 max-lg:left-0 max-lg:transition-transform',
          open ? 'max-lg:translate-x-0' : 'max-lg:-translate-x-full',
        )}
      >
        <div className="sticky top-0 flex h-screen flex-col">
        <div className="flex h-[72px] shrink-0 items-center justify-center">
          <span className="text-[40px] leading-none font-bold tracking-[-0.045em] text-sidebar-foreground">
            <span className="text-sidebar-primary">T</span>ASK
          </span>
        </div>

        <div className="mx-6 mb-1 flex h-control items-center gap-2 rounded-lg border border-input px-3">
          <Search className="size-icon shrink-0 text-muted-foreground opacity-(--opacity-muted-icon)" />
          <span className="text-body text-muted-foreground">Search menu...</span>
        </div>

        <nav className="flex-1 overflow-y-auto pb-4">
          {sections.map((section) => (
            <div key={section.heading}>
              <p className="px-5 pt-5 pb-1.5 text-caption font-semibold text-sidebar-muted">
                {section.heading}
              </p>
              {section.items.map((item) => (
                <a
                  key={item.label}
                  href="#"
                  aria-current={item.active ? 'page' : undefined}
                  className={cn(
                    'mx-3 flex h-10 items-center gap-1.5 rounded-lg px-2 text-body font-medium',
                    'transition-colors focus-visible:border focus-visible:border-sidebar-ring focus-visible:outline-none',
                    item.active
                      ? 'text-sidebar-primary'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent',
                  )}
                >
                  <item.icon className="size-icon-lg shrink-0" strokeWidth={1.75} />
                  <span className="truncate">{item.label}</span>
                  {item.expandable ? (
                    <ChevronRight className="ml-auto size-icon shrink-0 text-muted-foreground" />
                  ) : null}
                </a>
              ))}
            </div>
          ))}
        </nav>
        {footer ? <div className="shrink-0 px-3 pb-3">{footer}</div> : null}
        </div>
      </aside>
    </>
  )
}
