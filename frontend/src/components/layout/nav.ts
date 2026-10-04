import { LayoutDashboard, type LucideIcon } from 'lucide-react'
import type { UserRole } from '@/features/auth/types'

/* Sidebar trees per role. Milestone 1 ships the Dashboard entry only; each later module adds
   its own item here (PRD §5 company navigation, §7 admin navigation). Labels are i18n keys. */

export type NavItem = { labelKey: 'dashboard'; href: string; icon: LucideIcon }
export type NavSection = { headingKey: 'overview'; items: NavItem[] }

export const NAV: Record<UserRole, NavSection[]> = {
  company: [{ headingKey: 'overview', items: [{ labelKey: 'dashboard', href: '/dashboard', icon: LayoutDashboard }] }],
  super_admin: [
    { headingKey: 'overview', items: [{ labelKey: 'dashboard', href: '/admin/dashboard', icon: LayoutDashboard }] },
  ],
}

/** The nav item that owns `pathname` (exact match, or the longest prefix). */
export function activeItem(role: UserRole, pathname: string): NavItem | undefined {
  return NAV[role]
    .flatMap((section) => section.items)
    .filter((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0]
}
