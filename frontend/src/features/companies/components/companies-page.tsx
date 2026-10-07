'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { CircleAlert, History, Inbox, Plus, Search } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { PageHeader } from '@/components/layout/app-shell'
import { CardGrid } from '@/components/shared/card-grid'
import { DataTable } from '@/components/shared/data-table'
import { FilterBar } from '@/components/shared/filter-bar'
import { Pagination } from '@/components/shared/pagination'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Tooltip } from '@/components/ui/tooltip'
import { ViewToggle } from '@/components/ui/view-toggle'
import { useCompanies } from '@/features/companies/api'
import { CompanyCard, CompanyCardSkeleton } from '@/features/companies/components/company-card'
import { useCompanyColumns } from '@/features/companies/components/company-columns'
import { CompanyInlineFilters, CompanyPlanFilter } from '@/features/companies/components/company-filters'
import { useCompanyActionDialogs } from '@/features/companies/components/use-company-action-dialogs'
import type { Company } from '@/features/companies/types'
import { useCompanyListParams } from '@/features/companies/use-company-list-params'
import { toApiError } from '@/lib/api-error'

/* /admin/companies — PAGE SPEC A and the Companies screenshot: the header (title, subtitle, an
   outline History icon button and the green "+ Add Company"), the filter bar card (search ·
   All Status · Created At from/to · Filters → Plan + Reset · list/grid toggle), then the table
   (or the grid) with its footer. All list state — the view included — lives in the URL.
   Modals (useCompanyActionDialogs, shared with the details page): Add / Edit Company, Upgrade
   Plan, Reset Password and the global Activity History. */
export function CompaniesPage() {
  const t = useTranslations('companies.list')
  const router = useRouter()
  const list = useCompanyListParams()
  const { state, params, setPage, view, setView } = list
  const companies = useCompanies(params)
  const { actionsFor, dialogs, openCreate, openHistory } = useCompanyActionDialogs({
    onDetails: React.useCallback((company: Company) => router.push(`/admin/companies/${company.id}`), [router]),
  })
  const columns = useCompanyColumns(actionsFor)

  // A page past the end (e.g. after deleting the last row of the last page) → the last page.
  const data = companies.data
  const lastPage = data?.meta.last_page
  React.useEffect(() => {
    if (lastPage !== undefined && !companies.isPlaceholderData && state.page > lastPage) setPage(lastPage)
  }, [lastPage, companies.isPlaceholderData, state.page, setPage])

  const empty =
    companies.isError && !data ? (
      <EmptyState
        icon={CircleAlert}
        tone="danger"
        title={t('empty.errorTitle')}
        description={toApiError(companies.error).message}
        action={
          <Button variant="outline" onClick={() => companies.refetch()}>
            {t('empty.retry')}
          </Button>
        }
      />
    ) : list.isFiltered ? (
      <EmptyState
        icon={Search}
        title={t('empty.noMatchTitle')}
        description={t('empty.noMatchDescription')}
        action={
          <Button variant="outline" onClick={list.reset}>
            {t('empty.clearFilters')}
          </Button>
        }
      />
    ) : (
      <EmptyState
        icon={Inbox}
        title={t('empty.title')}
        description={t('empty.description')}
        action={
          <Button onClick={openCreate}>
            <Plus className="size-icon" aria-hidden="true" />
            {t('add')}
          </Button>
        }
      />
    )

  const footer = data ? (
    <Pagination
      page={data.meta.current_page}
      perPage={data.meta.per_page}
      total={data.meta.total}
      onPageChange={list.setPage}
      onPerPageChange={list.setPerPage}
    />
  ) : null

  return (
    <>
      <PageHeader
        title={t('title')}
        subtitle={t('subtitle')}
        action={
          <>
            <Tooltip content={t('history')}>
              <Button variant="outline" size="icon-sm" aria-label={t('history')} onClick={() => openHistory({ company: null })}>
                <History className="size-icon" aria-hidden="true" />
              </Button>
            </Tooltip>
            <Button size="sm" onClick={openCreate}>
              <Plus className="size-icon" aria-hidden="true" />
              {t('add')}
            </Button>
          </>
        }
      />

      <div className="mt-4 flex flex-col gap-4">
        <FilterBar
          density="compact"
          search={state.search}
          onSearchChange={list.setSearch}
          defaultAdvancedOpen={state.filters.plan_id !== ''}
          advanced={<CompanyPlanFilter filters={state.filters} onChange={list.setFilter} />}
          onReset={list.reset}
          canReset={list.isFiltered}
          actions={
            <ViewToggle
              value={view}
              onValueChange={setView}
              label={t('view.label')}
              listLabel={t('view.list')}
              gridLabel={t('view.grid')}
            />
          }
        >
          <CompanyInlineFilters filters={state.filters} onChange={list.setFilter} />
        </FilterBar>

        {view === 'grid' ? (
          <CardGrid
            label={t('gridLabel')}
            items={data?.data}
            getId={(company) => company.id}
            renderCard={(company) => <CompanyCard company={company} actions={actionsFor(company)} />}
            renderSkeleton={() => <CompanyCardSkeleton />}
            skeletonCount={Math.min(state.perPage, 6)}
            loading={companies.isPending}
            busy={companies.isFetching && companies.isPlaceholderData}
            empty={empty}
            footer={footer}
          />
        ) : (
          <DataTable
            density="relaxed"
            label={t('tableLabel')}
            columns={columns}
            rows={data?.data}
            getRowId={(company) => company.id}
            sort={state.sort}
            onSortChange={list.setSort}
            rowNumberOffset={((data?.meta.current_page ?? state.page) - 1) * (data?.meta.per_page ?? state.perPage)}
            loading={companies.isPending}
            skeletonRows={Math.min(state.perPage, 10)}
            busy={companies.isFetching && companies.isPlaceholderData}
            empty={empty}
            footer={footer}
          />
        )}
      </div>

      {dialogs}
    </>
  )
}
