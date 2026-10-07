import Link from 'next/link'
import { Building2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'

/* A missing or deleted company: the framed EmptyState (Companies' Building2 glyph) with a way
   back. Shown by the route's not-found.tsx (server 404) and by the page when the company
   disappears while it is open (deleted in another tab). */
export function CompanyNotFound() {
  const t = useTranslations('companies.details.notFound')

  return (
    <EmptyState
      framed
      className="mt-4"
      icon={Building2}
      title={t('title')}
      description={t('description')}
      action={
        <Button asChild variant="outline">
          <Link href="/admin/companies">{t('back')}</Link>
        </Button>
      }
    />
  )
}
