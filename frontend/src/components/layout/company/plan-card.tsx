'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Avatar } from '@/components/ui/avatar'
import type { User } from '@/features/auth/types'

/* The sidebar footer card (PRD §4; design/user-dashboard shell-config.tsx `CompanyPlanCard`):
   an `accent` card with the company's avatar and name, its plan under the name (a muted
   `caption` line, as drawn), and an outline "Upgrade" button (28px, 12px/500) that opens the
   Plans page. Name, avatar and plan are the signed-in company from /me — never sample data —
   the same live user the header dropdown reads, so both change together. */
export function CompanyPlanCard({ user }: { user: User }) {
  const t = useTranslations('companyShell')

  return (
    <section aria-label={t('planCard')} className="flex items-center gap-2.5 rounded-lg bg-accent p-2.5">
      <Avatar name={user.name} seed={user.id} src={user.avatar} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-title-row">{user.name}</span>
        {user.plan ? (
          <span className="block truncate text-caption font-normal text-muted-foreground">
            <span className="sr-only">{t('currentPlan')}: </span>
            {user.plan.name}
          </span>
        ) : null}
      </span>
      <Link
        href="/plans"
        aria-label={t('upgradeLabel')}
        className="inline-flex h-7 shrink-0 items-center rounded-lg border border-border bg-card px-2.5 text-[12px] font-medium shadow-sm transition-colors hover:bg-accent focus-visible:border-ring focus-visible:shadow-focus focus-visible:outline-none"
      >
        {t('upgrade')}
      </Link>
    </section>
  )
}
