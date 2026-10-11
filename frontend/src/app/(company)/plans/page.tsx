import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { PlansPage } from '@/features/billing/components/plans-page'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('billing.plans')
  return { title: t('title') }
}

/* The company Plans page (PRD §6.15, Billing PAGE SPEC A). The client <PlansPage /> reads the
   live catalog (GET /api/v1/plans); guarded by the (company) layout. */
export default function CompanyPlansPage() {
  return <PlansPage />
}
