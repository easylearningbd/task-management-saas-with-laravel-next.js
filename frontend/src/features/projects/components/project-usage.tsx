'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { UsageMeter } from '@/components/shared/usage-meter'
import { Card } from '@/components/ui/card'
import { usePlanUsage } from '@/features/plan-usage/api'
import { UNLIMITED } from '@/features/plan-usage/types'

/* The Projects page's usage strip (task PAGE SPEC B): the company's projects against its plan's
   allowance, full width between the stat cards and the filter bar (placement inferred — no design
   file or design-system component specifies one). A Card holding the shared UsageMeter; every
   number is the server's (GET /plan-usage — PlanLimitService, the same count and limit the create
   guard uses), so the bar and the enforcement can't disagree. Nothing is computed here but the
   wording:
     "Projects used   {used} of {limit} projects                 {remaining} remaining"
   under 80% green · 80–99% amber + "close to the limit" + Upgrade · at or over 100% red (clamped)
   + "reached" (or "over … existing projects stay") + Upgrade · a 0 allowance: "doesn't include
   projects" + Upgrade · unlimited (-1): "{used} projects" + an Unlimited badge, no bar, no Upgrade.
   Refreshed after every project create / delete (the projects mutations invalidate plan usage),
   on every visit (refetchOnMount: 'always' — a plan approved meanwhile shows at once), and by
   billing's plan sync. Nothing shows if the usage can't be read (the create guard still applies). */
export function ProjectUsage() {
  const t = useTranslations('projects.usage')
  const usage = usePlanUsage({ refetchOnMount: 'always' })

  if (usage.isError) return null

  const projects = usage.data?.projects
  const used = projects?.used ?? 0
  const unlimited = projects?.limit === UNLIMITED
  const limit = projects ? (unlimited ? null : projects.limit) : 0
  const full = limit === 0 ? t('none') : limit !== null && used > limit ? t('over') : t('full')

  return (
    <Card className="p-card">
      <UsageMeter
        label={t('label')}
        used={used}
        limit={limit}
        usedLabel={String(used)}
        figure={unlimited ? t('unlimited', { used }) : t('of', { used, limit: limit ?? 0 })}
        remaining={t('remaining', { remaining: projects?.remaining ?? 0 })}
        messages={{ near: t('near'), full }}
        action={
          <Link
            href="/plans"
            aria-label={t('upgradeLabel')}
            className="rounded-sm text-body-sm font-medium text-primary-strong hover:underline focus-visible:shadow-focus focus-visible:outline-none"
          >
            {t('upgrade')}
          </Link>
        }
        loading={usage.isPending}
      />
    </Card>
  )
}
