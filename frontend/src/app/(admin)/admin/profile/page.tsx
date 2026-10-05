import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { PageHeader } from '@/components/layout/app-shell'
import { ProfileSettings } from '@/features/profile/components/profile-settings'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('profile')
  return { title: t('title') }
}

/* Super Admin Profile Settings (PRD §2.3). Server Component shell: the header renders on the
   server; the nav and both forms are the client <ProfileSettings />. The (admin) layout guard
   already restricts this route to super admins. */
export default async function AdminProfilePage() {
  const t = await getTranslations('profile')

  return (
    <>
      <PageHeader title={t('title')} subtitle={t('subtitle')} />
      <div className="mt-3 rounded-xl border border-border p-4 md:p-card">
        <ProfileSettings />
      </div>
    </>
  )
}
