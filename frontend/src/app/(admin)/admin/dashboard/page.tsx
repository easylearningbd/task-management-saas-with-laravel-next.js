import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { PageHeader } from '@/components/layout/app-shell'
import { requireRole } from '@/features/auth/server'
import { SignedInCard } from '@/features/auth/components/signed-in-card'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('dashboard')
  return { title: t('title') }
}

/* Placeholder until the Dashboards milestone (PRD §8.1). */
export default async function AdminDashboardPage() {
  const t = await getTranslations('dashboard')
  const user = await requireRole('super_admin') // cached — same lookup as the layout

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t('title')} subtitle={t('adminSubtitle')} />
      <SignedInCard user={user} />
    </div>
  )
}
