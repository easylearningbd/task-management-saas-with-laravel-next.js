import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { PageHeader } from '@/components/layout/app-shell'
import { PlansOverview } from '@/features/plans/components/plans-overview'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('plans.list')
  return { title: t('title') }
}

/* Super Admin subscription plans (PRD §8.3). Server Component shell; the period toggle,
   cards and dialogs are the client <PlansOverview />. Guarded by the (admin) layout. */
export default async function AdminPlansPage() {
  const t = await getTranslations('plans.list')

  return (
    <>
      <PageHeader title={t('title')} subtitle={t('subtitle')} />
      <div className="mt-3 rounded-xl border border-border p-4 md:p-card">
        <PlansOverview />
      </div>
    </>
  )
}
