'use client'

import { useTranslations } from 'next-intl'
import { Avatar } from '@/components/ui/avatar'
import { ComingSoon } from '@/components/ui/coming-soon'
import type { User } from '@/features/auth/types'

/* The sidebar footer card (PRD §4; design/user-dashboard shell-config.tsx `CompanyPlanCard`):
   an `accent` card with the company's avatar and name, its plan under the name, and an
   outline "Upgrade" button (28px, 12px/500) that will open the Plans page.
   Name and avatar are the signed-in company from /me — never sample data.
   TODO(plan): /me does not return the plan yet (Phase 0, decision 3), so the plan line is
   left out rather than faked; render `plan.name` here once the resource carries it.
   Upgrade stays "Coming soon" until the company Plans page exists. */
export function CompanyPlanCard({ user }: { user: User }) {
  const t = useTranslations('companyShell')

  return (
    <section aria-label={t('planCard')} className="flex items-center gap-2.5 rounded-lg bg-accent p-2.5">
      <Avatar name={user.name} seed={user.id} src={user.avatar} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-title-row">{user.name}</span>
      </span>
      <ComingSoon side="top">
        <button
          type="button"
          aria-label={t('upgradeLabel')}
          className="inline-flex h-7 shrink-0 items-center rounded-lg border border-border bg-card px-2.5 text-[12px] font-medium shadow-sm transition-colors focus-visible:border-ring focus-visible:shadow-focus focus-visible:outline-none"
        >
          {t('upgrade')}
        </button>
      </ComingSoon>
    </section>
  )
}
