'use client'

import * as React from 'react'
import Link from 'next/link'
import { CircleAlert, CreditCard, Search } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { PageHeader } from '@/components/layout/app-shell'
import { DataTable } from '@/components/shared/data-table'
import { FilterBar } from '@/components/shared/filter-bar'
import { Pagination } from '@/components/shared/pagination'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { usePlanOrders } from '@/features/billing/api'
import { usePlanOrderColumns } from '@/features/billing/components/plan-order-columns'
import { PlanOrderDetailsModal } from '@/features/billing/components/plan-order-details-modal'
import { PlanOrderStatusFilter, PlanOrderTypeFilter } from '@/features/billing/components/plan-order-filters'
import type { PlanOrder } from '@/features/billing/types'
import { usePlanOrderListParams } from '@/features/billing/use-plan-order-list-params'
import { useSyncMeWithOrders } from '@/features/billing/use-plan-sync'
import { toApiError } from '@/lib/api-error'

/* /plans/requests — PAGE SPEC C and the Plan Requests screenshot: the header (title, subtitle, no
   Add button), the compact filter bar card (search · All Status · Filters → Type + Reset, no view
   toggle), then the table with its footer. Every order the company has submitted — requests,
   purchases and trials — newest first. A row opens PlanOrderDetailsModal (which keeps its record
   while it animates closed). States: skeleton rows, an empty state pointing at Plans, no results,
   and a load error with retry. All list state lives in the URL. While a row is pending the list
   re-asks every 30s, and a decision that lands refreshes the header and sidebar plan (/me). */

type DetailsState = { open: boolean; order: PlanOrder | null }

export function PlanRequestsPage() {
  const t = useTranslations('billing.requests')
  const list = usePlanOrderListParams()
  const { state, params, setPage } = list
  const orders = usePlanOrders(params)
  useSyncMeWithOrders(orders.data?.data)
  const columns = usePlanOrderColumns()
  const [details, setDetails] = React.useState<DetailsState>({ open: false, order: null })

  // A page past the end (e.g. an old link) → the last page.
  const data = orders.data
  const lastPage = data?.meta.last_page
  React.useEffect(() => {
    if (lastPage !== undefined && !orders.isPlaceholderData && state.page > lastPage) setPage(lastPage)
  }, [lastPage, orders.isPlaceholderData, state.page, setPage])

  const empty =
    orders.isError && !data ? (
      <EmptyState
        icon={CircleAlert}
        tone="danger"
        title={t('empty.errorTitle')}
        description={toApiError(orders.error).message}
        action={
          <Button variant="outline" onClick={() => orders.refetch()}>
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
        icon={CreditCard}
        title={t('empty.title')}
        description={t('empty.description')}
        action={
          <Button asChild>
            <Link href="/plans">{t('empty.action')}</Link>
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
      <PageHeader title={t('title')} subtitle={t('subtitle')} />

      <div className="mt-4 flex flex-col gap-4">
        <FilterBar
          density="compact"
          search={state.search}
          onSearchChange={list.setSearch}
          defaultAdvancedOpen={state.filters.type !== ''}
          advanced={<PlanOrderTypeFilter filters={state.filters} onChange={list.setFilter} />}
          onReset={list.reset}
          canReset={list.isFiltered}
        >
          <PlanOrderStatusFilter filters={state.filters} onChange={list.setFilter} />
        </FilterBar>

        <DataTable
          density="relaxed"
          label={t('tableLabel')}
          columns={columns}
          rows={data?.data}
          getRowId={(order) => order.id}
          sort={state.sort}
          onSortChange={list.setSort}
          rowNumberOffset={((data?.meta.current_page ?? state.page) - 1) * (data?.meta.per_page ?? state.perPage)}
          loading={orders.isPending}
          skeletonRows={Math.min(state.perPage, 10)}
          busy={orders.isFetching && orders.isPlaceholderData}
          empty={empty}
          footer={footer}
          onRowClick={(order) => setDetails({ open: true, order })}
          rowLabel={(order) => t('openDetails', { code: order.order_code })}
        />
      </div>

      <PlanOrderDetailsModal
        open={details.open}
        onOpenChange={(open) => setDetails((d) => ({ ...d, open }))}
        order={details.order}
      />
    </>
  )
}
