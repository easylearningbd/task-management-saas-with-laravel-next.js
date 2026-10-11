import Link from 'next/link'
import { SquareCheck } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { PageHeader } from '@/components/layout/app-shell'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'

/* A missing, deleted or other company's task — the API answers 404 for all three, so the page
   can't tell them apart and never says which (as ProjectNotFound). Shown by the route's
   not-found.tsx (server 404) and by the page when the task disappears while it is open. */
export function TaskNotFound() {
  const t = useTranslations('tasks.details.notFound')

  return (
    <>
      <PageHeader title={t('heading')} />
      <EmptyState
        framed
        className="mt-4"
        icon={SquareCheck}
        title={t('title')}
        description={t('description')}
        action={
          <Button asChild variant="outline">
            <Link href="/tasks">{t('back')}</Link>
          </Button>
        }
      />
    </>
  )
}
