import Link from 'next/link'
import { Folder } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { PageHeader } from '@/components/layout/app-shell'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'

/* A missing, deleted or other company's project — the API answers 404 for all three, so the
   page can't tell them apart and never says which. The framed EmptyState with a way back to the
   list. Shown by the route's not-found.tsx (server 404) and by the page when the project
   disappears while it is open (deleted in another tab). */
export function ProjectNotFound() {
  const t = useTranslations('projects.details.notFound')

  return (
    <>
      <PageHeader title={t('heading')} />
      <EmptyState
        framed
        className="mt-4"
        icon={Folder}
        title={t('title')}
        description={t('description')}
        action={
          <Button asChild variant="outline">
            <Link href="/projects">{t('back')}</Link>
          </Button>
        }
      />
    </>
  )
}
