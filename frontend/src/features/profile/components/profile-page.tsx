import { getTranslations } from 'next-intl/server'
import { PageHeader } from '@/components/layout/app-shell'
import { ProfileSettings } from '@/features/profile/components/profile-settings'

/* Profile Settings (PRD §2.3 / §4.1) — the whole page body, shared by /admin/profile and the
   company's /profile so both roles get one implementation. Server Component: the header
   ("Profile Settings" / "Update profile settings.") renders on the server; the section nav
   and both forms are the client <ProfileSettings />, which talk to the role-neutral
   /api/v1/profile endpoints for whoever is signed in. Each route's layout guard decides who
   may open it — nothing here is role-specific. */
export async function ProfilePage() {
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
