import {
  Calendar,
  CalendarClock,
  CalendarDays,
  CreditCard,
  DollarSign,
  Gift,
  Image,
  LayoutDashboard,
  Mail,
  PanelsTopLeft,
  Settings,
  Settings2,
  SquareCheck,
  Users,
  Video,
  type LucideIcon,
} from 'lucide-react'
import type { Messages } from 'next-intl'

/* The company sidebar tree — kept apart from the Super Admin tree (components/layout/nav.ts)
   so the two shells never affect each other. Groups and order: PRD §5; the first five groups
   and their icons: design/user-dashboard (components/company/shell-config.tsx); routes:
   PRD §12. Icons for the groups the design capture cuts off: Plans `CreditCard`, Referral
   Program `Gift`, Media Library `Image`, Notification Templates `Mail` (the admin side's
   glyphs), Settings `Settings` (brand-book.md), Configuration `Settings2` (approved).
   Every route is listed now; only those in BUILT navigate — the rest render as
   "Coming soon" (UNBUILT ROUTES rule), so nothing can land on a 404. */

export type CompanyNavKey = keyof Messages['companyShell']['nav']
export type CompanySectionKey = keyof Messages['companyShell']['sections']

export type CompanyNavLeaf = { labelKey: CompanyNavKey; href: string }
export type CompanyNavItem = CompanyNavLeaf & { icon: LucideIcon; children?: CompanyNavLeaf[] }
export type CompanyNavSection = { headingKey: CompanySectionKey; items: CompanyNavItem[] }

/** Company routes that exist today. Add a route here when its page ships. */
export const BUILT: ReadonlySet<string> = new Set(['/dashboard', '/clients', '/configuration/expense-categories'])

export const isBuilt = (href: string) => BUILT.has(href)

export const COMPANY_NAV: CompanyNavSection[] = [
  {
    headingKey: 'overview',
    items: [
      { labelKey: 'dashboard', href: '/dashboard', icon: LayoutDashboard },
      { labelKey: 'calendar', href: '/calendar', icon: Calendar },
    ],
  },
  {
    headingKey: 'projectManagement',
    items: [
      { labelKey: 'tasks', href: '/tasks', icon: SquareCheck },
      { labelKey: 'projects', href: '/projects', icon: PanelsTopLeft },
      { labelKey: 'timeTracker', href: '/time-tracker', icon: CalendarClock },
      { labelKey: 'timesheets', href: '/timesheets', icon: CalendarDays },
    ],
  },
  { headingKey: 'clientRelations', items: [{ labelKey: 'clients', href: '/clients', icon: Users }] },
  {
    headingKey: 'financialManagement',
    items: [
      {
        labelKey: 'financial',
        href: '#financial',
        icon: DollarSign,
        children: [
          { labelKey: 'invoices', href: '/invoices' },
          { labelKey: 'expenses', href: '/expenses' },
          { labelKey: 'contracts', href: '/contracts' },
          { labelKey: 'items', href: '/items' },
        ],
      },
    ],
  },
  { headingKey: 'meetings', items: [{ labelKey: 'zoomMeetings', href: '/zoom-meetings', icon: Video }] },
  {
    headingKey: 'systemConfiguration',
    items: [
      {
        labelKey: 'configuration',
        href: '#configuration',
        icon: Settings2,
        children: [
          { labelKey: 'taskStages', href: '/configuration/task-stages' },
          { labelKey: 'expenseCategories', href: '/configuration/expense-categories' },
        ],
      },
    ],
  },
  {
    headingKey: 'accountBilling',
    items: [
      {
        labelKey: 'plans',
        href: '#plans',
        icon: CreditCard,
        children: [
          { labelKey: 'plan', href: '/plans' },
          { labelKey: 'planRequest', href: '/plans/requests' },
          { labelKey: 'planOrders', href: '/plans/orders' },
        ],
      },
      { labelKey: 'referralProgram', href: '/referral', icon: Gift },
    ],
  },
  {
    headingKey: 'systemControl',
    items: [
      { labelKey: 'notificationTemplates', href: '/notification-templates', icon: Mail },
      { labelKey: 'mediaLibrary', href: '/media', icon: Image },
      { labelKey: 'settings', href: '/settings', icon: Settings },
    ],
  },
]

/** Top-bar titles for company pages that are not in the sidebar (reached from the user menu).
 *  Keys of `shell.nav` — the same strings the Super Admin top bar uses. */
export const COMPANY_PAGE_TITLES: Readonly<Record<string, 'profileSettings'>> = { '/profile': 'profileSettings' }

/** The leaf that owns `pathname` (exact or longest prefix), with its parent if it has one. */
export function activeCompanyEntry(pathname: string): { leaf: CompanyNavLeaf; parent?: CompanyNavItem } | undefined {
  const matches = (href: string) => href.startsWith('/') && (pathname === href || pathname.startsWith(`${href}/`))
  let best: { leaf: CompanyNavLeaf; parent?: CompanyNavItem } | undefined
  for (const section of COMPANY_NAV) {
    for (const item of section.items) {
      const candidates: { leaf: CompanyNavLeaf; parent?: CompanyNavItem }[] = item.children
        ? item.children.map((child) => ({ leaf: child, parent: item }))
        : [{ leaf: item }]
      for (const candidate of candidates) {
        if (matches(candidate.leaf.href) && (!best || candidate.leaf.href.length > best.leaf.href.length)) best = candidate
      }
    }
  }
  return best
}
