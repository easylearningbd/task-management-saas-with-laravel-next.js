import type { Metadata } from 'next'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { AuthShell } from '@/features/auth/components/auth-shell'
import { LoginForm } from '@/features/auth/components/login-form'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('auth.login')
  return { title: t('title') }
}

/* Company login. Super admins use /admin/login. */
export default async function LoginPage() {
  const t = await getTranslations('auth.login')

  return (
    <AuthShell
      title={t('title')}
      subtitle={t('subtitle')}
      footer={
        <>
          {t('noAccount')}{' '}
          <Link
            href="/register"
            className="rounded-sm font-medium text-primary-strong hover:underline focus-visible:shadow-focus focus-visible:outline-none"
          >
            {t('registerLink')}
          </Link>
        </>
      }
    >
      <LoginForm variant="company" demoMode={process.env.NEXT_PUBLIC_DEMO_MODE === 'true'} />
    </AuthShell>
  )
}
