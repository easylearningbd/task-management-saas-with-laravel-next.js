'use client'

import * as React from 'react'
import Link from 'next/link'
import { ChevronRight, Search } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Logo } from '@/components/ui/logo'
import { activeItem, NAV, type NavItem, type NavLeaf } from '@/components/layout/nav'
import { cn } from '@/lib/cn'
import type { UserRole } from '@/features/auth/types'

/* design-system/components/SidebarNav.md, ported from the dashboard designs' sidebar.tsx:
   fixed `sidebar-width` column, wordmark, "Search menu..." filter, sectioned items. A parent
   with children carries a trailing chevron and expands in place; sub-items sit behind a 1px
   `sidebar-border` rail and the active one gets a 2px `sidebar-primary` bar. Below `lg` the
   sidebar is an off-canvas drawer over an `overlay` scrim. */

const itemClass = (active: boolean) =>
  cn(
    'mx-3 flex h-10 items-center gap-1.5 rounded-lg px-2 text-body font-medium transition-colors',
    'focus-visible:border focus-visible:border-sidebar-ring focus-visible:outline-none',
    active ? 'text-sidebar-primary' : 'text-sidebar-foreground hover:bg-sidebar-accent',
  )

export function Sidebar({ role, open, onClose }: { role: UserRole; open: boolean; onClose: () => void }) {
  const t = useTranslations('shell')
  const tCommon = useTranslations('common')
  const pathname = usePathname()
  const tree = NAV[role]
  const active = activeItem(role, pathname)
  const [query, setQuery] = React.useState('')
  const [expanded, setExpanded] = React.useState<ReadonlySet<string>>(() => new Set())

  const needle = query.trim().toLocaleLowerCase()
  const label = (entry: NavLeaf) => t(`nav.${entry.labelKey}`)
  const hit = (entry: NavLeaf) => label(entry).toLocaleLowerCase().includes(needle)

  // Filter: keep an item if it or any child matches; a matching child forces its parent open.
  const sections = tree.sections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => !needle || hit(item) || (item.children ?? []).some(hit)),
    }))
    .filter((section) => section.items.length > 0)

  const isOpen = (item: NavItem) =>
    expanded.has(item.href) ||
    (item.children ?? []).some((child) => child === active) ||
    (needle !== '' && (item.children ?? []).some(hit))

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
        )}
      >
        <div className="sticky top-0 flex h-svh flex-col">
          <div className="flex h-[72px] shrink-0 items-center justify-center">
            <Logo label={tCommon('appName')} />
          </div>

          {tree.searchable ? (
            <label className="mx-6 mb-1 flex h-control shrink-0 items-center gap-2 rounded-lg border border-input px-3 transition-colors focus-within:border-ring focus-within:shadow-focus">
              <Search className="size-icon shrink-0 text-muted-foreground opacity-muted-icon" aria-hidden="true" />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t('searchMenu')}
                aria-label={t('searchMenu')}
                className="min-w-0 flex-1 bg-transparent text-body text-sidebar-foreground placeholder:text-muted-foreground focus:outline-none"
              />
            </label>
          ) : null}

          <nav aria-label={t('mainNavigation')} className="flex-1 overflow-y-auto pb-4">
            {sections.length === 0 ? (
              <p className="px-5 pt-5 text-body-sm text-muted-foreground">{t('noMenuResults')}</p>
            ) : null}
            {sections.map((section) => (
              <div key={section.headingKey}>
                <p className="px-5 pt-5 pb-1.5 text-caption font-semibold text-sidebar-muted">
                  {t(`sections.${section.headingKey}`)}
                </p>
                {section.items.map((item) => {
                  if (!item.children) {
                    const isActive = item === active
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={onClose}
                        aria-current={isActive ? 'page' : undefined}
                        className={itemClass(isActive)}
                      >
                        <item.icon className="size-icon-lg shrink-0" strokeWidth={1.75} aria-hidden="true" />
                        <span className="truncate">{label(item)}</span>
                      </Link>
                    )
                  }

                  // Parent: tinted when one of its pages is active; the chevron row toggles.
                  const childActive = item.children.some((child) => child === active)
                  const expandedNow = isOpen(item)
                  const listId = `nav-${item.labelKey}`
                  return (
                    <div key={item.href}>
                      <button
                        type="button"
                        onClick={() => toggle(item.href)}
                        aria-expanded={expandedNow}
                        aria-controls={listId}
                        className={cn(itemClass(childActive), 'w-[calc(100%-1.5rem)] text-left')}
                      >
                        <item.icon className="size-icon-lg shrink-0" strokeWidth={1.75} aria-hidden="true" />
                        <span className="truncate">{label(item)}</span>
                        <ChevronRight
                          className={cn('ml-auto size-icon shrink-0 text-muted-foreground transition-transform', expandedNow && 'rotate-90')}
                          aria-hidden="true"
                        />
                      </button>
                      {expandedNow ? (
                        /* rail at the parent icon's centre: mx-3 + px-2 + half of size-icon-lg = 30px */
                        <ul id={listId} className="mt-0.5 mr-3 ml-7.5 border-l border-sidebar-border">
                          {item.children
                            .filter((child) => !needle || hit(item) || hit(child))
                            .map((child) => {
                              const isActive = child === active
                              return (
                                <li key={child.href}>
                                  <Link
                                    href={child.href}
                                    onClick={onClose}
                                    aria-current={isActive ? 'page' : undefined}
                                    className={cn(
                                      // pl-3.5: label lines up with the parent's (46px − 30px rail − 2px bar)
                                      '-ml-px flex h-8.5 items-center rounded-r-lg border-l-2 pl-3.5 text-body transition-colors',
                                      'focus-visible:shadow-focus focus-visible:outline-none',
                                      isActive
                                        ? 'border-sidebar-primary font-medium text-sidebar-primary'
                                        : 'border-transparent text-sidebar-foreground hover:bg-sidebar-accent',
                                    )}
                                  >
                                    <span className="truncate">{label(child)}</span>
                                  </Link>
                                </li>
                              )
                            })}
                        </ul>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            ))}
          </nav>
        </div>
      </aside>
    </>
  )
}
