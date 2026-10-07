import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { ProfilePage } from '@/features/profile/components/profile-page'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('profile')
  return { title: t('title') }
}

/* Company Profile Settings (PRD §4.1) — the same shared Profile Settings page body as
   /admin/profile (features/profile), inside the company shell. The (company) layout guard
   restricts this route to company users; the forms edit the signed-in account only. */
export default function CompanyProfilePage() {
  return <ProfilePage />
}
