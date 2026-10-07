import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { PageHeader } from '@/components/layout/app-shell'
import { Button } from '@/components/ui/button'

/* The details page header — title + subtitle, and an outline "← Back" (toolbar size) to the
   companies list, as on Create / Edit Plan. Shared by the page, its loading skeleton and its
   404 state so the frame never jumps. */
export function CompanyDetailsHeader() {
  const t = useTranslations('companies.details')

  return (
    <PageHeader
      title={t('title')}
      subtitle={t('subtitle')}
      action={
        <Button asChild variant="outline" size="sm">
          <Link href="/admin/companies">
            <ArrowLeft className="size-icon" aria-hidden="true" />
            {t('back')}
          </Link>
        </Button>
      }
    />
  )
}
