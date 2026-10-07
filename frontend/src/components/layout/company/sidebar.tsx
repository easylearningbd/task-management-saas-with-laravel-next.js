'use client'

import * as React from 'react'
import Link from 'next/link'
import { ChevronRight, Search } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { ComingSoon } from '@/components/ui/coming-soon'
import { Logo } from '@/components/ui/logo'
import {
  activeCompanyEntry,
  COMPANY_NAV,
  isBuilt,
  type CompanyNavItem,
  type CompanyNavLeaf,
} from '@/components/layout/company/nav'
import { cn } from '@/lib/cn'

/* The company sidebar — design/user-dashboard/components/shell/sidebar.tsx with the company
   tree (company/nav.ts) and the plan card as a pinned footer (PRD §4: "Sidebar footer
   (company only)"). Same parts as design-system/components/SidebarNav.md: `sidebar-width`
   column, wordmark, "Search menu..." filter, section headings, items 40px on `radius-lg`;
   the active item in `sidebar-primary` (the design's green treatment — no fill at the top
   level), a sub-item behind a 1px `sidebar-border` rail with a 2px `sidebar-primary` bar
   when active. Below `lg` it is an off-canvas drawer over an `overlay` scrim; from `lg` the
   top-bar toggle hides it entirely (`collapsed`).
   Not-yet-built destinations stay visible but are "Coming soon" buttons (ComingSoon), never
   links. Kept separate from the Super Admin sidebar on purpose. */

const itemClass = (active: boolean) =>
  cn(
    'mx-3 flex h-10 items-center gap-1.5 rounded-lg px-2 text-body font-medium transition-colors',
    'focus-visible:border focus-visible:border-sidebar-ring focus-visible:outline-none',
    active ? 'text-sidebar-primary' : 'text-sidebar-foreground hover:bg-sidebar-accent',
  )

const subItemClass = (active: boolean) =>
  cn(
    // pl-3.5: label lines up with the parent's (46px − 30px rail − 2px bar)
    '-ml-px flex h-8.5 w-full items-center rounded-r-lg border-l-2 pl-3.5 text-left text-body transition-colors',
    'focus-visible:shadow-focus focus-visible:outline-none',
    active ? 'border-sidebar-primary font-medium text-sidebar-primary' : 'border-transparent text-sidebar-foreground hover:bg-sidebar-accent',
  )

export function CompanySidebar({
  open,
  collapsed,
  onClose,
  footer,
}: {
  /** Drawer state below `lg`. */
  open: boolean
  /** Hidden from `lg` up (the top-bar toggle). */
  collapsed: boolean
  onClose: () => void
  footer?: React.ReactNode
}) {
  const t = useTranslations('companyShell')
  const tShell = useTranslations('shell')
  const tCommon = useTranslations('common')
  const pathname = usePathname()
  const active = activeCompanyEntry(pathname)
  const [query, setQuery] = React.useState('')
  const [expanded, setExpanded] = React.useState<ReadonlySet<string>>(() => new Set())

  const needle = query.trim().toLocaleLowerCase()
  const label = (entry: CompanyNavLeaf) => t(`nav.${entry.labelKey}`)
  const hit = (entry: CompanyNavLeaf) => label(entry).toLocaleLowerCase().includes(needle)

  // Filter: keep an item if it or any child matches; a matching child opens its parent.
  const sections = COMPANY_NAV.map((section) => ({
    ...section,
    items: section.items.filter((item) => !needle || hit(item) || (item.children ?? []).some(hit)),
  })).filter((section) => section.items.length > 0)

  const isOpen = (item: CompanyNavItem) =>
    expanded.has(item.href) || active?.parent === item || (needle !== '' && (item.children ?? []).some(hit))

  const toggle = (href: string) =>
    setExpanded((current) => {
      const next = new Set(current)
      if (next.has(href)) next.delete(href)
      else next.add(href)
      return next
    })

  return (
    <>
      <div
        onClick={onClose}
        className={cn('fixed inset-0 z-30 bg-overlay lg:hidden', open ? 'block' : 'hidden')}
        aria-hidden="true"
      />
      <aside
        id="app-sidebar"
        className={cn(
          'z-40 flex w-sidebar shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground',
          'max-lg:fixed max-lg:inset-y-0 max-lg:left-0 max-lg:transition-transform',
          open ? 'max-lg:translate-x-0' : 'max-lg:-translate-x-full',
          collapsed && 'lg:hidden',
        )}
      >
        <div className="sticky top-0 flex h-svh flex-col">
          <div className="flex h-[72px] shrink-0 items-center justify-center">
            <Logo label={tCommon('appName')} />
          </div>

          <label className="mx-6 mb-1 flex h-control shrink-0 items-center gap-2 rounded-lg border border-input px-3 transition-colors focus-within:border-ring focus-within:shadow-focus">
            <Search className="size-icon shrink-0 text-muted-foreground opacity-muted-icon" aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={tShell('searchMenu')}
              aria-label={tShell('searchMenu')}
              className="min-w-0 flex-1 bg-transparent text-body text-sidebar-foreground placeholder:text-muted-foreground focus:outline-none"
            />
          </label>

          <nav aria-label={tShell('mainNavigation')} className="flex-1 overflow-y-auto pb-4">
            {sections.length === 0 ? <p className="px-5 pt-5 text-body-sm text-muted-foreground">{tShell('noMenuResults')}</p> : null}
            {sections.map((section) => (
              <div key={section.headingKey}>
                <p className="px-5 pt-5 pb-1.5 text-caption font-semibold text-sidebar-muted">{t(`sections.${section.headingKey}`)}</p>
                {section.items.map((item) =>
                  item.children ? (
                    <ParentItem
                      key={item.href}
                      item={item}
                      label={label}
                      open={isOpen(item)}
                      childActive={active?.parent === item}
                      activeLeaf={active?.leaf}
                      visibleChildren={item.children.filter((child) => !needle || hit(item) || hit(child))}
                      onToggle={() => toggle(item.href)}
                      onNavigate={onClose}
                    />
                  ) : isBuilt(item.href) ? (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onClose}
                      aria-current={active?.leaf === item ? 'page' : undefined}
                      className={itemClass(active?.leaf === item)}
                    >
                      <item.icon className="size-icon-lg shrink-0" strokeWidth={1.75} aria-hidden="true" />
                      <span className="truncate">{label(item)}</span>
                    </Link>
                  ) : (
                    <ComingSoon key={item.href} side="right">
                      <button type="button" className={cn(itemClass(false), 'w-[calc(100%-1.5rem)] text-left')}>
                        <item.icon className="size-icon-lg shrink-0" strokeWidth={1.75} aria-hidden="true" />
                        <span className="truncate">{label(item)}</span>
                      </button>
                    </ComingSoon>
                  ),
                )}
              </div>
            ))}
          </nav>

          {footer ? <div className="shrink-0 px-3 pb-3">{footer}</div> : null}
        </div>
      </aside>
    </>
  )
}

/** A group with sub-pages: the row toggles it; sub-items sit behind the rail. */
function ParentItem({
  item,
  label,
  open,
  childActive,
  activeLeaf,
  visibleChildren,
  onToggle,
  onNavigate,
}: {
  item: CompanyNavItem
  label: (entry: CompanyNavLeaf) => string
  open: boolean
  childActive: boolean
  activeLeaf: CompanyNavLeaf | undefined
  visibleChildren: CompanyNavLeaf[]
  onToggle: () => void
  onNavigate: () => void
}) {
  const listId = `company-nav-${item.labelKey}`
  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={listId}
        className={cn(itemClass(childActive), 'w-[calc(100%-1.5rem)] text-left')}
      >
        <item.icon className="size-icon-lg shrink-0" strokeWidth={1.75} aria-hidden="true" />
        <span className="truncate">{label(item)}</span>
        <ChevronRight
          className={cn('ml-auto size-icon shrink-0 text-muted-foreground transition-transform', open && 'rotate-90')}
          aria-hidden="true"
        />
      </button>
      {open ? (
        /* rail at the parent icon's centre: mx-3 + px-2 + half of size-icon-lg = 30px */
        <ul id={listId} className="mt-0.5 mr-3 ml-7.5 border-l border-sidebar-border">
          {visibleChildren.map((child) => {
            const isActive = child === activeLeaf
            return (
              <li key={child.href}>
                {isBuilt(child.href) ? (
                  <Link href={child.href} onClick={onNavigate} aria-current={isActive ? 'page' : undefined} className={subItemClass(isActive)}>
                    <span className="truncate">{label(child)}</span>
                  </Link>
                ) : (
                  <ComingSoon side="right">
                    <button type="button" className={subItemClass(false)}>
                      <span className="truncate">{label(child)}</span>
                    </button>
                  </ComingSoon>
                )}
              </li>
            )
          })}
        </ul>
      ) : null}
    </div>
  )
}
