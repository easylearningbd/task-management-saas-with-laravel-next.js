import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { PageHeader } from '@/components/layout/app-shell'
import { requireRole } from '@/features/auth/server'
import { AdminDashboard } from '@/features/admin-dashboard/components/admin-dashboard'
import { RefreshButton } from '@/features/admin-dashboard/components/refresh-button'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('adminDashboard')
  return { title: t('title') }
}

/* Super Admin dashboard — design/admin-dashboard/app/(super-admin)/dashboard/page.tsx.
   Server Component: the header renders on the server; the data-driven sections are the
   client <AdminDashboard />. Data is mocked until the stats/charts endpoints exist. */
export default async function AdminDashboardPage() {
  const t = await getTranslations('adminDashboard')
  const user = await requireRole('super_admin') // cached — same lookup as the layout guard

  return (
    <>
      <PageHeader title={t('title')} subtitle={t('subtitle')} action={<RefreshButton />} />
      <AdminDashboard userName={user.name} />
    </>
  )
}
