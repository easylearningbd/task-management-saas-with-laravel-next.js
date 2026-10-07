'use client'

import { Briefcase, CircleAlert } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { ListRow, ListRows } from '@/components/shared/list-row'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeading } from '@/components/ui/card'
import { ComingSoon } from '@/components/ui/coming-soon'
import { EmptyState } from '@/components/ui/empty-state'
import { ViewAllButton } from '@/features/admin-dashboard/components/view-all-link'
import { CONTRACT_STATUS_TONE } from '@/features/company-dashboard/components/tones'
import { useCompanyDashboardFormat } from '@/features/company-dashboard/format'
import type { RecentContract } from '@/features/company-dashboard/types'

/* design/user-dashboard panels.tsx `RecentContracts` (PRD §6.1): the latest five — Briefcase
   tile, title, a 20px muted initials chip with the client's name, the amount in `money`
   (`text-money` as the design file writes it — no `font-mono`, see the Coupons decision) and
   the status badge; "View all" is Coming soon. */
export function RecentContracts({ contracts, currency }: { contracts: RecentContract[]; currency: string }) {
  const t = useTranslations('companyDashboard.recentContracts')
  const tStatus = useTranslations('companyDashboard.contractStatus')
  const tDashboard = useTranslations('companyDashboard')
  const f = useCompanyDashboardFormat(currency)

  return (
    <Card className="flex h-full flex-col">
      <CardHeading
        divided
        title={t('title')}
        subtitle={t('subtitle')}
        action={
          <ComingSoon>
            <ViewAllButton label={tDashboard('viewAll')} />
          </ComingSoon>
        }
      />
      {contracts.length === 0 ? (
        <EmptyState icon={CircleAlert} message={t('empty')} className="flex flex-1 flex-col items-center justify-center" />
      ) : (
        <ListRows label={t('title')} className="flex-1">
          {contracts.map((contract) => (
            <ListRow
              key={contract.id}
              icon={Briefcase}
              title={contract.title}
              subtitle={
                <p className="mt-0.5 flex items-center gap-1.5">
                  <Avatar size="xs" muted name={contract.client.name} seed={contract.client.id} />
                  <span className="truncate text-body-sm text-muted-foreground">{contract.client.name}</span>
                </p>
              }
              aside={
                <>
                  <span className="text-money">{f.money(contract.amount)}</span>
                  <Badge tone={CONTRACT_STATUS_TONE[contract.status]} outlined>
                    {tStatus(contract.status)}
                  </Badge>
                </>
              }
            />
          ))}
        </ListRows>
      )}
    </Card>
  )
}
