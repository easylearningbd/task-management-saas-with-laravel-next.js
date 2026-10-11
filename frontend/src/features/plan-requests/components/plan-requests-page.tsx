'use client'

import * as React from 'react'
import { Check, CircleAlert, CreditCard, Search, X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { PageHeader } from '@/components/layout/app-shell'
import { DataTable } from '@/components/shared/data-table'
import { FilterBar } from '@/components/shared/filter-bar'
import { Pagination } from '@/components/shared/pagination'
import type { RowActionItem } from '@/components/shared/row-actions'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { usePlanOrderColumns, type PlanOrderColumnOptions } from '@/features/billing/components/plan-order-columns'
import { PlanOrderStatusFilter } from '@/features/billing/components/plan-order-filters'
import { useAdminPlanOrders } from '@/features/plan-requests/api'
import { PlanRequestAdvancedFilters } from '@/features/plan-requests/components/plan-request-filters'
import { PlanRequestRejectModal } from '@/features/plan-requests/components/plan-request-reject-modal'
import { PlanRequestReviewModal } from '@/features/plan-requests/components/plan-request-review-modal'
import type { AdminPlanOrder, AdminPlanOrderSortKey } from '@/features/plan-requests/types'
import { usePlanRequestListParams } from '@/features/plan-requests/use-plan-request-list-params'
import { toApiError } from '@/lib/api-error'

/* /admin/plans/requests — task PAGE SPEC A and the admin Plan Requests screenshot: the header
   ("Plan Requests", "View and manage all plan requests from companies.", no button, no stat
   cards), the compact filter bar (search · All Status · Filters → Plan + Type + Reset; no view
   toggle), then every company's orders, newest first (Phase 0 decision 4: no pending-first sort —
   the screenshot is plain newest-first; the Pending filter finds them):
     # · Company ↕ · Plan ↕ · Plan Duration · Status ↕-less · Requested At ↕ · Actions
   — the company page's columns (billing's usePlanOrderColumns: same cells, the admin sort keys
   and the screenshot's widths), plus Actions: on PENDING rows only, ✓ (review & approve —
   `success` on hover) and ✗ (reject — `danger` on hover), muted at rest as drawn; empty otherwise.
   ✓ and a click on any row open PlanRequestReviewModal (Approve for a pending order, read-only for
   a reviewed one); ✗ opens PlanRequestRejectModal. Each modal keeps its record while it animates
   closed; the reject form is fresh per opening. States: skeleton rows, an empty state, no results
   (Clear filters), a load error with retry. All list state lives in the URL. */

const WIDTHS = { company: 'w-[32%]', plan: 'w-[12%]', duration: 'w-[15%]', status: 'w-[13%]', requestedAt: 'w-[19%]' }
const SORT_KEYS = { company: 'company', plan: 'plan', requestedAt: 'created_at' } as const

type ModalState = { open: boolean; order: AdminPlanOrder | null }

export function PlanRequestsPage() {
  const t = useTranslations('planRequests.list')
  const list = usePlanRequestListParams()
  const { state, params, setPage } = list
  const orders = useAdminPlanOrders(params)
  const [review, setReview] = React.useState<ModalState>({ open: false, order: null })
  const [reject, setReject] = React.useState<ModalState & { key: number }>({ key: 0, open: false, order: null })

  const openReview = React.useCallback((order: AdminPlanOrder) => setReview({ open: true, order }), [])
  const openReject = React.useCallback((order: AdminPlanOrder) => setReject((r) => ({ key: r.key + 1, open: true, order })), [])

  const actionItems = React.useCallback(
    (order: AdminPlanOrder): RowActionItem[] | null =>
      order.status !== 'pending'
        ? null
        : [
            { id: 'approve', label: t('approve', { code: order.order_code }), tooltip: t('approveTooltip'), icon: Check, tone: 'success', onClick: () => openReview(order) },
            { id: 'reject', label: t('reject', { code: order.order_code }), tooltip: t('rejectTooltip'), icon: X, tone: 'danger', onClick: () => openReject(order) },
          ],
    [t, openReview, openReject],
  )
  const columnOptions = React.useMemo<PlanOrderColumnOptions<AdminPlanOrder, AdminPlanOrderSortKey>>(
    () => ({ sortKeys: SORT_KEYS, widths: WIDTHS, actions: { header: t('actions'), items: actionItems } }),
    [t, actionItems],
  )
  const columns = usePlanOrderColumns(columnOptions)

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
      <EmptyState icon={CreditCard} title={t('empty.title')} description={t('empty.description')} />
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
          defaultAdvancedOpen={state.filters.type !== '' || state.filters.plan_id !== ''}
          advanced={<PlanRequestAdvancedFilters filters={state.filters} onChange={list.setFilter} />}
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
          onRowClick={openReview}
          rowLabel={(order) => t('openDetails', { code: order.order_code })}
        />
      </div>

      <PlanRequestReviewModal open={review.open} onOpenChange={(open) => setReview((r) => ({ ...r, open }))} order={review.order} />
      <PlanRequestRejectModal
        key={reject.key}
        open={reject.open}
        onOpenChange={(open) => setReject((r) => ({ ...r, open }))}
        order={reject.order}
      />
    </>
  )
}
