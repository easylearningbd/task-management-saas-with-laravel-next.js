import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { Button } from '@/components/ui/button'
import { Logo } from '@/components/ui/logo'
import { ThemeToggle } from '@/components/ui/theme-toggle'

/* Placeholder until the landing page milestone (PRD §8.9). */
export default async function HomePage() {
  const t = await getTranslations()

  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 px-4 py-12 text-center">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <Logo label={t('common.appName')} />
      <div className="flex flex-col gap-1">
        <h1 className="text-title-page">{t('home.title')}</h1>
        <p className="text-body text-muted-foreground">{t('home.subtitle')}</p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button asChild size="lg">
          <Link href="/login">{t('home.companyLogin')}</Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href="/register">{t('home.register')}</Link>
        </Button>
        <Button asChild size="lg" variant="ghost">
          <Link href="/admin/login">{t('home.adminLogin')}</Link>
        </Button>
      </div>
    </main>
  )
}
