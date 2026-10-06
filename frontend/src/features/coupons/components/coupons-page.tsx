'use client'

import * as React from 'react'
import { CircleAlert, Inbox, Plus, Search } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { PageHeader } from '@/components/layout/app-shell'
import { DataTable } from '@/components/shared/data-table'
import { FilterBar } from '@/components/shared/filter-bar'
import { Pagination } from '@/components/shared/pagination'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { EmptyState } from '@/components/ui/empty-state'
import { toast } from '@/components/ui/toast'
import { useCoupons, useDeleteCoupon, useToggleCouponStatus } from '@/features/coupons/api'
import { useCouponColumns } from '@/features/coupons/components/coupon-columns'
import { CouponDetailsModal } from '@/features/coupons/components/coupon-details-modal'
import { CouponExpiryRange, CouponInlineFilters } from '@/features/coupons/components/coupon-filters'
import { CouponFormModal } from '@/features/coupons/components/coupon-form-modal'
import type { Coupon } from '@/features/coupons/types'
import { useCouponListParams } from '@/features/coupons/use-coupon-list-params'
import { toApiError } from '@/lib/api-error'

/* /admin/coupons — PAGE SPEC A and the Coupons screenshot: the header (title, subtitle, green
   "+ Add Coupon"), the filter bar card (search · All Types · All Status · Filters → expiry
   range + Reset), then the table card with its footer (count · rows per page · pages).
   All list state lives in the URL (useCouponListParams). Sizes are the screenshot's
   (`compact` table and filter bar), agreed in the Phase 0 decisions. The Add / Edit modal and
   the eye icon's details modal live here too. */
export function CouponsPage() {
  const t = useTranslations('coupons.list')
  const list = useCouponListParams()
  const { state, params, setPage } = list
  const coupons = useCoupons(params)
  const { mutateAsync: toggleAsync } = useToggleCouponStatus()
  const remove = useDeleteCoupon()

  const [deleting, setDeleting] = React.useState<Coupon | null>(null)
  const [deleteError, setDeleteError] = React.useState<string | null>(null)

  // Add / Edit share one modal; a new key per opening gives a fresh form every time.
  const [form, setForm] = React.useState<{ key: number; open: boolean; coupon: Coupon | null }>({ key: 0, open: false, coupon: null })
  const [viewing, setViewing] = React.useState<Coupon | null>(null)
  const openCreate = React.useCallback(() => setForm((f) => ({ key: f.key + 1, open: true, coupon: null })), [])
  const openEdit = React.useCallback((coupon: Coupon) => setForm((f) => ({ key: f.key + 1, open: true, coupon })), [])
  const openView = React.useCallback((coupon: Coupon) => setViewing(coupon), [])

  const openDelete = React.useCallback((coupon: Coupon) => {
    setDeleteError(null)
    setDeleting(coupon)
  }, [])

  const toggleStatus = React.useCallback(
    (coupon: Coupon) =>
      toggleAsync(coupon.id).then((updated) => {
        toast.success(updated.is_active ? t('status.activated') : t('status.deactivated'))
      }),
    [toggleAsync, t],
  )
  const toggleFailed = React.useCallback(
    (error: unknown) => {
      const apiError = toApiError(error)
      toast.error(t('status.failed'), apiError.status === 0 ? undefined : apiError.message)
    },
    [t],
  )

  const columns = useCouponColumns({
    onView: openView,
    onEdit: openEdit,
    onDelete: openDelete,
    onToggle: toggleStatus,
    onToggleError: toggleFailed,
  })

  const confirmDelete = () => {
    if (!deleting) return
    remove.mutate(deleting.id, {
      onSuccess: () => {
        setDeleting(null)
        toast.success(t('delete.deleted'))
      },
      onError: (error) => setDeleteError(toApiError(error).message),
    })
  }

  // A page past the end (e.g. after deleting the last row of the last page) → the last page.
  const data = coupons.data
  const lastPage = data?.meta.last_page
  React.useEffect(() => {
    if (lastPage !== undefined && !coupons.isPlaceholderData && state.page > lastPage) setPage(lastPage)
  }, [lastPage, coupons.isPlaceholderData, state.page, setPage])

  const empty = coupons.isError && !data ? (
    <EmptyState
      icon={CircleAlert}
      tone="danger"
      title={t('empty.errorTitle')}
      description={toApiError(coupons.error).message}
      action={
        <Button variant="outline" onClick={() => coupons.refetch()}>
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

  const advancedSet = state.filters.expiry_from !== '' || state.filters.expiry_to !== ''

  return (
    <>
      <PageHeader
        title={t('title')}
        subtitle={t('subtitle')}
        action={
          <Button size="sm" onClick={openCreate}>
            <Plus className="size-icon" aria-hidden="true" />
            {t('add')}
          </Button>
        }
      />

      <div className="mt-4 flex flex-col gap-4">
        <FilterBar
          density="compact"
          search={state.search}
          onSearchChange={list.setSearch}
          defaultAdvancedOpen={advancedSet}
          advanced={<CouponExpiryRange filters={state.filters} onChange={list.setFilter} />}
          onReset={list.reset}
          canReset={list.isFiltered}
        >
          <CouponInlineFilters filters={state.filters} onChange={list.setFilter} />
        </FilterBar>

        <DataTable
          density="compact"
          label={t('tableLabel')}
          columns={columns}
          rows={data?.data}
          getRowId={(coupon) => coupon.id}
          sort={state.sort}
          onSortChange={list.setSort}
          rowNumberOffset={((data?.meta.current_page ?? state.page) - 1) * (data?.meta.per_page ?? state.perPage)}
          loading={coupons.isPending}
          skeletonRows={Math.min(state.perPage, 10)}
          busy={coupons.isFetching && coupons.isPlaceholderData}
          empty={empty}
          footer={
            data ? (
              <Pagination
                page={data.meta.current_page}
                perPage={data.meta.per_page}
                total={data.meta.total}
                onPageChange={list.setPage}
                onPerPageChange={list.setPerPage}
              />
            ) : null
          }
        />
      </div>

      <CouponFormModal
        key={form.key}
        open={form.open}
        onOpenChange={(open) => setForm((f) => ({ ...f, open }))}
        coupon={form.coupon}
      />

      <CouponDetailsModal
        coupon={viewing}
        onOpenChange={(open) => {
          if (!open) setViewing(null)
        }}
      />

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null)
        }}
        title={t('delete.title')}
        description={deleting ? t('delete.body', { name: deleting.name, code: deleting.code }) : ''}
        confirmLabel={t('delete.confirm')}
        cancelLabel={t('delete.cancel')}
        closeLabel={t('delete.close')}
        onConfirm={confirmDelete}
        pending={remove.isPending}
        error={deleteError}
      />
    </>
  )
}
