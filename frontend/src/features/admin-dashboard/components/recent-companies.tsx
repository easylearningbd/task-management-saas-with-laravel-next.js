'use client'

import { Inbox } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeading } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import type { RecentCompany } from '@/features/admin-dashboard/types'
import { useDashboardFormat } from '@/features/admin-dashboard/format'
import { ViewAllLink } from '@/features/admin-dashboard/components/view-all-link'

/* design/admin-dashboard/components/dashboard/lists.tsx — RecentCompanies:
   Card + Avatar + two-line identity + status Badge over the relative join date. */
export function RecentCompanies({ companies, currency }: { companies: RecentCompany[]; currency: string }) {
  const t = useTranslations('adminDashboard')
  const f = useDashboardFormat(currency)

  return (
    <Card className="flex h-full flex-col">
      <CardHeading
        title={t('recentCompanies.title')}
        subtitle={t('recentCompanies.subtitle')}
        action={<ViewAllLink href="/admin/companies" label={t('viewAll')} />}
      />
      {companies.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title={t('recentCompanies.emptyTitle')}
          description={t('recentCompanies.emptyDescription')}
        />
      ) : (
        <ul className="flex flex-col gap-0.5 p-card pt-4 pb-1">
          {companies.map((company) => (
            <li key={company.id} className="flex items-center gap-3 rounded-lg px-2 py-3 transition-colors hover:bg-accent">
              <Avatar name={company.name} seed={company.id} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-title-row">{company.name}</p>
                <p className="truncate text-body-sm text-muted-foreground">{company.email}</p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <Badge tone={company.status === 'active' ? 'success' : 'neutral'}>
                  {t(`recentCompanies.${company.status}`)}
                </Badge>
                <span className="text-caption font-normal text-muted-foreground">{f.relative(company.joinedAt)}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
