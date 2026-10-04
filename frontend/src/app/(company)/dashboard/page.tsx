import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { PageHeader } from '@/components/layout/app-shell'
import { requireRole } from '@/features/auth/server'
import { SignedInCard } from '@/features/auth/components/signed-in-card'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('dashboard')
  return { title: t('title') }
}

/* Placeholder until the Dashboards milestone (PRD §6.1). */
export default async function CompanyDashboardPage() {
  const t = await getTranslations('dashboard')
  const user = await requireRole('company') // cached — same lookup as the layout

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t('title')} subtitle={t('companySubtitle')} />
      <SignedInCard user={user} />
    </div>
  )
}
