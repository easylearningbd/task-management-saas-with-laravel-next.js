import type { Metadata } from 'next'
import { Suspense } from 'react'
import { getTranslations } from 'next-intl/server'
import { PlanRequestsPage } from '@/features/billing/components/plan-requests-page'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('billing.requests')
  return { title: t('metaTitle') }
}

/* The company Plan Requests page (Billing PAGE SPEC C). The client <PlanRequestsPage /> keeps its
   list state in the URL (useSearchParams, hence the Suspense boundary). Guarded by the (company)
   layout; the API lists only the signed-in company's own orders. */
export default function CompanyPlanRequestsPage() {
  return (
    <Suspense>
      <PlanRequestsPage />
    </Suspense>
  )
}
