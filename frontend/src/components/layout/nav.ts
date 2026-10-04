import {
  Building2,
  Compass,
  CreditCard,
  DollarSign,
  Gift,
  Image,
  LayoutDashboard,
  Mail,
  Settings2,
  Tag,
  type LucideIcon,
} from 'lucide-react'
import type { UserRole } from '@/features/auth/types'

/* Sidebar trees per role. Labels are i18n keys under `shell.nav` / `shell.sections`.
   Admin: the tree from design/admin-dashboard (routes per PRD §12). Pages not built yet
   still link to their final route. Company: Dashboard only until its modules land. */

export type NavLabelKey =
  | 'dashboard'
  | 'companies'
  | 'mediaLibrary'
  | 'plans'
  | 'planRequests'
  | 'planOrders'
  | 'coupons'
  | 'currency'
  | 'referralProgram'
  | 'landingPage'
  | 'emailTemplates'
  | 'settings'

export type NavSectionKey = 'overview' | 'management' | 'systemControl'

export type NavItem = { labelKey: NavLabelKey; href: string; icon: LucideIcon; children?: NavLeaf[] }
export type NavLeaf = { labelKey: NavLabelKey; href: string }
export type NavSection = { headingKey: NavSectionKey; items: NavItem[] }
export type NavTree = { sections: NavSection[]; /** Show the "Search menu..." filter. */ searchable: boolean }

export const NAV: Record<UserRole, NavTree> = {
  company: {
    searchable: false,
    sections: [{ headingKey: 'overview', items: [{ labelKey: 'dashboard', href: '/dashboard', icon: LayoutDashboard }] }],
  },
  super_admin: {
    searchable: true,
    sections: [
      { headingKey: 'overview', items: [{ labelKey: 'dashboard', href: '/admin/dashboard', icon: LayoutDashboard }] },
      {
        headingKey: 'management',
        items: [
          { labelKey: 'companies', href: '/admin/companies', icon: Building2 },
          { labelKey: 'mediaLibrary', href: '/admin/media', icon: Image },
          {
            labelKey: 'plans',
            href: '/admin/plans',
            icon: CreditCard,
            children: [
              { labelKey: 'plans', href: '/admin/plans' },
              { labelKey: 'planRequests', href: '/admin/plans/requests' },
              { labelKey: 'planOrders', href: '/admin/plans/orders' },
            ],
          },
          { labelKey: 'coupons', href: '/admin/coupons', icon: Tag },
          { labelKey: 'currency', href: '/admin/currencies', icon: DollarSign },
          { labelKey: 'referralProgram', href: '/admin/referral', icon: Gift },
          { labelKey: 'landingPage', href: '/admin/landing-page', icon: Compass },
        ],
      },
      {
        headingKey: 'systemControl',
        items: [
          { labelKey: 'emailTemplates', href: '/admin/email-templates', icon: Mail },
          { labelKey: 'settings', href: '/admin/settings', icon: Settings2 },
        ],
      },
    ],
  },
}

const matches = (pathname: string, href: string) => pathname === href || pathname.startsWith(`${href}/`)

/** The deepest nav entry that owns `pathname` (exact match, or the longest prefix). */
export function activeItem(role: UserRole, pathname: string): NavLeaf | undefined {
  return NAV[role].sections
    .flatMap((section) => section.items.flatMap((item) => [item, ...(item.children ?? [])]))
    .filter((entry) => matches(pathname, entry.href))
    .sort((a, b) => b.href.length - a.href.length)[0]
}
