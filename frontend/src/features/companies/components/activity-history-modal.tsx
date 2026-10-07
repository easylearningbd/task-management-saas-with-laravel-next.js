'use client'

import * as React from 'react'
import { CircleAlert, History } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Pagination } from '@/components/shared/pagination'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogBody, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { useAllActivities, useCompanyActivities } from '@/features/companies/api'
import { formatDateTime } from '@/features/companies/format'
import type { CompanyActivity, CompanyActivityAction } from '@/features/companies/types'
import { toApiError } from '@/lib/api-error'
import { useHydrated } from '@/lib/use-hydrated'

/* The activity history (task spec, Phase 7): the header button shows every company's log, a
   row action shows one company's. An 872px modal whose body scrolls: one entry per row — the
   action as a badge (status colours per brand-book.md), its description, the company (global
   log), who did it ("System" for seeded entries) and when — newest first, then the shared
   Pagination. Loading skeleton, empty and error states. */

export type HistoryTarget = { company: { id: number; name: string } | null }

export const ACTIVITY_TONES: Record<CompanyActivityAction, 'success' | 'info' | 'warning' | 'danger' | 'neutral'> = {
  created: 'info',
  updated: 'neutral',
  plan_changed: 'info',
  login_enabled: 'success',
  login_disabled: 'warning',
  password_reset: 'warning',
  impersonated: 'info',
  impersonation_ended: 'neutral',
  deleted: 'danger',
}

export function ActivityHistoryModal({
  open,
  target,
  onOpenChange,
}: {
  open: boolean
  /** Kept while closing; give the modal a new `key` per opening to start on page 1. */
  target: HistoryTarget | null
  onOpenChange: (open: boolean) => void
}) {
  const t = useTranslations('shared.modal')
  const th = useTranslations('companies.history')
  const [page, setPage] = React.useState(1)
  const [perPage, setPerPage] = React.useState(10)
  const companyId = target?.company?.id ?? null
  const params = { page, per_page: perPage }

  const one = useCompanyActivities(companyId, params, { enabled: open && companyId !== null })
  const all = useAllActivities(params, { enabled: open && companyId === null })
  const query = companyId !== null ? one : all
  const data = query.data

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size="lg"
        closeLabel={t('close')}
        divided
        heading={
          <span className="flex items-center gap-3">
            <span className="inline-flex size-tile shrink-0 items-center justify-center rounded-tile bg-primary-soft text-primary-strong">
              <History className="size-icon-lg" aria-hidden="true" />
            </span>
            {target?.company ? th('companyTitle', { name: target.company.name }) : th('title')}
          </span>
        }
        description={target?.company ? th('subtitleOne') : th('subtitleAll')}
      >
        <DialogBody>
          {query.isPending ? (
            <ul aria-hidden="true" className="divide-y divide-border">
              {Array.from({ length: 5 }, (_, i) => (
                <li key={i} className="flex gap-4 py-3">
                  <Skeleton className="h-6 w-28" />
                  <span className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-3 w-1/3" />
                  </span>
                </li>
              ))}
            </ul>
          ) : query.isError && !data ? (
            <EmptyState
              icon={CircleAlert}
              tone="danger"
              title={th('errorTitle')}
              description={toApiError(query.error).message}
              action={
                <Button variant="outline" onClick={() => query.refetch()}>
                  {th('retry')}
                </Button>
              }
            />
          ) : (data?.data.length ?? 0) === 0 ? (
            <EmptyState icon={History} title={th('empty')} description={th('emptyDescription')} />
          ) : (
            <>
              <ul aria-label={th('listLabel')} aria-busy={query.isFetching || undefined} className="divide-y divide-border">
                {data?.data.map((entry) => (
                  <ActivityRow key={entry.id} entry={entry} showCompany={companyId === null} />
                ))}
              </ul>
              {data ? (
                <div className="mt-4 border-t border-border pt-4">
                  <Pagination
                    page={data.meta.current_page}
                    perPage={data.meta.per_page}
                    total={data.meta.total}
                    onPageChange={setPage}
                    onPerPageChange={(size, nextPage) => {
                      setPerPage(size)
                      setPage(nextPage)
                    }}
                  />
                </div>
              ) : null}
            </>
          )}
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {th('close')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** One log entry; also used by the details page's Activity card. */
export function ActivityRow({ entry, showCompany }: { entry: CompanyActivity; showCompany: boolean }) {
  const th = useTranslations('companies.history')
  // The viewer's local time — only after hydration (the server's zone is not the viewer's).
  const when = useHydrated() ? formatDateTime(entry.created_at) : null

  return (
    <li className="flex flex-col gap-1.5 py-3 sm:flex-row sm:items-start sm:gap-4">
      <span className="sm:w-44 sm:shrink-0">
        <Badge tone={ACTIVITY_TONES[entry.action]} outlined>
          {entry.action_label}
        </Badge>
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-body text-foreground">
          {showCompany && entry.company ? (
            <>
              <span className="font-medium">{entry.company.name}</span>
              {entry.company.deleted ? <span className="text-muted-foreground"> {th('deleted')}</span> : null}
              {entry.description ? <span className="text-muted-foreground"> · {entry.description}</span> : null}
            </>
          ) : (
            entry.description
          )}
        </span>
        <span className="block text-body-sm text-muted-foreground">
          {entry.actor ? th('by', { name: entry.actor.name }) : th('system')}
          {when ? (
            <>
              {' · '}
              <time dateTime={entry.created_at ?? undefined}>{when}</time>
            </>
          ) : null}
        </span>
      </span>
    </li>
  )
}
