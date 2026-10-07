import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { PageHeader } from '@/components/layout/app-shell'
import { requireRole } from '@/features/auth/server'
import { CompanyDashboard } from '@/features/company-dashboard/components/company-dashboard'
import { QuickAccess } from '@/features/company-dashboard/components/quick-access'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('companyDashboard')
  return { title: t('title') }
}

/* Company dashboard — design/user-dashboard/app/(company)/dashboard/page.tsx (PRD §6.1).
   Server Component: the header renders on the server; Quick Access (a menu) and the
   data-driven sections are client components. Section data is mocked
   (features/company-dashboard/mock.ts) until the tenant modules and their endpoints exist;
   the company's name comes from the signed-in account. */
export default async function CompanyDashboardPage() {
  const t = await getTranslations('companyDashboard')
  const user = await requireRole('company') // cached — same lookup as the layout guard

  return (
    <>
      <PageHeader title={t('title')} subtitle={t('subtitle')} action={<QuickAccess />} />
      <CompanyDashboard companyName={user.name} />
    </>
  )
}
