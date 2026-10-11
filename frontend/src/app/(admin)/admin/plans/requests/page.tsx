import type { Metadata } from 'next'
import { Suspense } from 'react'
import { getTranslations } from 'next-intl/server'
import { PlanRequestsPage } from '@/features/plan-requests/components/plan-requests-page'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('planRequests.list')
  return { title: t('title') }
}

/* Super Admin Plan Requests (PRD §8.4; task PAGE SPEC A). The whole page is the client
   <PlanRequestsPage />: its list state lives in the URL (useSearchParams, hence the Suspense
   boundary). Guarded by the (admin) layout; the API reads every company's orders. */
export default function AdminPlanRequestsPage() {
  return (
    <Suspense>
      <PlanRequestsPage />
    </Suspense>
  )
}
