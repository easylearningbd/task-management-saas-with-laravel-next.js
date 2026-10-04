import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { AuthShell } from '@/features/auth/components/auth-shell'
import { LoginForm } from '@/features/auth/components/login-form'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('auth.adminLogin')
  return { title: t('title') }
}

/* Super Admin login. No register link — the admin account is seeded only. */
export default async function AdminLoginPage() {
  const t = await getTranslations('auth.adminLogin')

  return (
    <AuthShell title={t('title')} subtitle={t('subtitle')}>
      <LoginForm variant="admin" demoMode={process.env.NEXT_PUBLIC_DEMO_MODE === 'true'} />
    </AuthShell>
  )
}
