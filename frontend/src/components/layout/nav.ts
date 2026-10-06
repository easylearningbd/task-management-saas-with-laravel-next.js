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
  | 'plan'
  | 'planRequests'
  | 'planOrders'
  | 'coupons'
  | 'currency'
  | 'referralProgram'
  | 'landingPage'
  | 'emailTemplates'
  | 'settings'
  | 'profileSettings'
  | 'createPlan'
  | 'editPlan'

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
            // Sub-item labels as in the Plans screenshots: "Plan", "Plan Request", "Plan Orders".
            children: [
              { labelKey: 'plan', href: '/admin/plans' },
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

/** Top-bar titles for pages that are not in the sidebar (e.g. reached from the user menu). */
const PAGE_TITLES: Record<UserRole, Record<string, NavLabelKey>> = {
  company: {},
  super_admin: { '/admin/profile': 'profileSettings' },
}

/** One step of the top bar's breadcrumb; every step but the last links somewhere. */
export type Crumb = { labelKey: NavLabelKey; href?: string }

/* Multi-step breadcrumbs for routes that need them (the Plans screenshots: "Dashboard › Plans"
   and "Dashboard › Plans › Create Plan"; the Coupons screenshot: "Dashboard › Coupons"). Every other route keeps its single title. */
const ADMIN_DASHBOARD: Crumb = { labelKey: 'dashboard', href: '/admin/dashboard' }
const TRAILS: Record<UserRole, { match: RegExp; crumbs: Crumb[] }[]> = {
  company: [],
  super_admin: [
    { match: /^\/admin\/plans$/, crumbs: [ADMIN_DASHBOARD, { labelKey: 'plans' }] },
    { match: /^\/admin\/plans\/create$/, crumbs: [ADMIN_DASHBOARD, { labelKey: 'plans', href: '/admin/plans' }, { labelKey: 'createPlan' }] },
    { match: /^\/admin\/plans\/\d+\/edit$/, crumbs: [ADMIN_DASHBOARD, { labelKey: 'plans', href: '/admin/plans' }, { labelKey: 'editPlan' }] },
    { match: /^\/admin\/coupons$/, crumbs: [ADMIN_DASHBOARD, { labelKey: 'coupons' }] },
  ],
}

const matches = (pathname: string, href: string) => pathname === href || pathname.startsWith(`${href}/`)

/** The label key the top bar shows for `pathname`: its nav entry, else its page title. */
export function pageTitleKey(role: UserRole, pathname: string): NavLabelKey | undefined {
  return activeItem(role, pathname)?.labelKey ?? PAGE_TITLES[role][pathname]
}

/** The top bar's breadcrumb for `pathname`: a configured trail, else just the page title. */
export function breadcrumbsFor(role: UserRole, pathname: string): Crumb[] {
  const trail = TRAILS[role].find((entry) => entry.match.test(pathname))
  if (trail) return trail.crumbs
  const titleKey = pageTitleKey(role, pathname)
  return titleKey ? [{ labelKey: titleKey }] : []
}

/** The deepest nav entry that owns `pathname` (exact match, or the longest prefix). Children
 *  are listed before their parent so that, when a sub-item shares its parent's href (Plans ▸
 *  Plan → /admin/plans), the tie goes to the sub-item and the group opens on it. */
export function activeItem(role: UserRole, pathname: string): NavLeaf | undefined {
  return NAV[role].sections
    .flatMap((section) => section.items.flatMap((item) => [...(item.children ?? []), item]))
    .filter((entry) => matches(pathname, entry.href))
    .sort((a, b) => b.href.length - a.href.length)[0]
}
