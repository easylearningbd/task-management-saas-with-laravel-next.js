'use client'

import { Banknote, CircleAlert } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { ListRow, ListRows } from '@/components/shared/list-row'
import { Card, CardHeading } from '@/components/ui/card'
import { ComingSoon } from '@/components/ui/coming-soon'
import { EmptyState } from '@/components/ui/empty-state'
import { ViewAllButton } from '@/features/admin-dashboard/components/view-all-link'
import { useCompanyDashboardFormat } from '@/features/company-dashboard/format'
import type { InvoiceDeadline } from '@/features/company-dashboard/types'

/* design/user-dashboard panels.tsx `InvoiceDeadlines` (PRD §6.1): "Upcoming Invoice
   Deadlines" with "View all" (Coming soon — no Invoices page yet). The design shows only the
   empty state: a muted CircleAlert circle over "No upcoming invoice deadlines". With data,
   rows follow the deadline list next to it: Banknote tile, invoice number, client, the due
   date in `danger` and the balance due in `money` (the design has no filled version). */
export function InvoiceDeadlines({ deadlines, currency }: { deadlines: InvoiceDeadline[]; currency: string }) {
  const t = useTranslations('companyDashboard.invoiceDeadlines')
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
      {deadlines.length === 0 ? (
        <EmptyState icon={CircleAlert} message={t('empty')} className="flex flex-1 flex-col items-center justify-center" />
      ) : (
        <ListRows label={t('title')} className="flex-1">
          {deadlines.map((invoice) => (
            <ListRow
              key={invoice.id}
              icon={Banknote}
              density="relaxed"
              title={invoice.number}
              subtitle={invoice.client}
              aside={
                <>
                  <time dateTime={invoice.dueDate} className="text-body-sm font-medium text-danger">
                    {invoice.dueDate}
                  </time>
                  <span className="text-money">{f.money(invoice.amountDue)}</span>
                </>
              }
            />
          ))}
        </ListRows>
      )}
    </Card>
  )
}
