'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Logo } from '@/components/ui/logo'
import { activeItem, NAV } from '@/components/layout/nav'
import { cn } from '@/lib/cn'
import type { UserRole } from '@/features/auth/types'

/* design-system/components/SidebarNav.md, ported from the dashboard designs' sidebar.tsx:
   fixed `sidebar-width` column, wordmark, sectioned items. Below `lg` it is an off-canvas
   drawer over an `overlay` scrim. The menu search box arrives with the full nav tree. */
export function Sidebar({ role, open, onClose }: { role: UserRole; open: boolean; onClose: () => void }) {
  const t = useTranslations('shell')
  const tCommon = useTranslations('common')
  const pathname = usePathname()
  const active = activeItem(role, pathname)

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

          <nav aria-label={t('mainNavigation')} className="flex-1 overflow-y-auto pb-4">
            {NAV[role].map((section) => (
              <div key={section.headingKey}>
                <p className="px-5 pt-5 pb-1.5 text-caption font-semibold text-sidebar-muted">
                  {t(`sections.${section.headingKey}`)}
                </p>
                {section.items.map((item) => {
                  const isActive = item === active
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onClose}
                      aria-current={isActive ? 'page' : undefined}
                      className={cn(
                        'mx-3 flex h-10 items-center gap-1.5 rounded-lg px-2 text-body font-medium transition-colors',
                        'focus-visible:border focus-visible:border-sidebar-ring focus-visible:outline-none',
                        isActive ? 'text-sidebar-primary' : 'text-sidebar-foreground hover:bg-sidebar-accent',
                      )}
                    >
                      <item.icon className="size-icon-lg shrink-0" strokeWidth={1.75} aria-hidden="true" />
                      <span className="truncate">{t(`nav.${item.labelKey}`)}</span>
                    </Link>
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
