import type { Metadata } from 'next'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { AuthShell } from '@/features/auth/components/auth-shell'
import { RegisterForm } from '@/features/auth/components/register-form'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('auth.register')
  return { title: t('title') }
}

/* Public sign-up for companies. There is no super admin registration. */
export default async function RegisterPage() {
  const t = await getTranslations('auth.register')

  return (
    <AuthShell
      title={t('title')}
      subtitle={t('subtitle')}
      footer={
        <>
          {t('haveAccount')}{' '}
          <Link
            href="/login"
            className="rounded-sm font-medium text-primary-strong hover:underline focus-visible:shadow-focus focus-visible:outline-none"
          >
            {t('loginLink')}
          </Link>
        </>
      }
    >
      <RegisterForm />
    </AuthShell>
  )
}
