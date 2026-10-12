'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CircleAlert, Eye, FileText, Plus, Search, SquarePen, Trash2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { PageHeader } from '@/components/layout/app-shell'
import { DataTable } from '@/components/shared/data-table'
import { FilterBar } from '@/components/shared/filter-bar'
import { Pagination } from '@/components/shared/pagination'
import type { RowAction } from '@/components/shared/row-actions'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { EmptyState } from '@/components/ui/empty-state'
import { toast } from '@/components/ui/toast'
import { useDeleteInvoice, useInvoices } from '@/features/invoices/api'
import { useInvoiceColumns } from '@/features/invoices/components/invoice-columns'
import { InvoiceInlineFilters, InvoiceOverdueFilter } from '@/features/invoices/components/invoice-filters'
import type { InvoiceListItem } from '@/features/invoices/types'
import { useInvoiceListParams } from '@/features/invoices/use-invoice-list-params'
import { toApiError } from '@/lib/api-error'

/* /invoices — PAGE SPEC A and the Invoices screenshot: the header (title, subtitle, green
   "+ Create Invoice"), the compact filter bar card (search · All Status · All Clients · All
   Projects · invoice date from / to · Filters → Overdue only + Reset; no view toggle), then the
   table with its footer. Actions follow the status: the eye opens the invoice; Draft and Sent
   invoices also get the pencil (edit) and the trash (a confirm naming the invoice — the server
   refuses Partial / Paid anyway). States: skeleton rows, an empty state with Create Invoice, no
   results (Clear filters), a load error with retry. All list state lives in the URL. */

export function InvoicesPage() {
  const t = useTranslations('invoices.list')
  const router = useRouter()
  const list = useInvoiceListParams()
  const { state, params, setPage } = list
  const invoices = useInvoices(params)
  const remove = useDeleteInvoice()
  const [deleting, setDeleting] = React.useState<InvoiceListItem | null>(null)
  const [deleteError, setDeleteError] = React.useState<string | null>(null)

  const actionsFor = React.useCallback(
    (invoice: InvoiceListItem): RowAction[] => [
      { id: 'view', label: t('actions.view', { number: invoice.invoice_number }), tooltip: t('actions.viewTip'), icon: Eye, onClick: () => router.push(`/invoices/${invoice.id}`) },
      ...(invoice.can_edit
        ? [
            { id: 'edit', label: t('actions.edit', { number: invoice.invoice_number }), tooltip: t('actions.editTip'), icon: SquarePen, onClick: () => router.push(`/invoices/${invoice.id}/edit`) },
            {
              id: 'delete',
              label: t('actions.delete', { number: invoice.invoice_number }),
              tooltip: t('actions.deleteTip'),
              icon: Trash2,
              tone: 'danger' as const,
              onClick: () => {
                setDeleteError(null)
                setDeleting(invoice)
              },
            },
          ]
        : []),
    ],
    [t, router],
  )
  const columns = useInvoiceColumns(actionsFor)

  // A page past the end (e.g. after deleting the last row of the last page) → the last page.
  const data = invoices.data
  const lastPage = data?.meta.last_page
  React.useEffect(() => {
    if (lastPage !== undefined && !invoices.isPlaceholderData && state.page > lastPage) setPage(lastPage)
  }, [lastPage, invoices.isPlaceholderData, state.page, setPage])

  const confirmDelete = () => {
    if (!deleting) return
    remove.mutate(deleting.id, {
      onSuccess: () => {
        toast.success(t('delete.deleted', { number: deleting.invoice_number }))
        setDeleting(null)
      },
      onError: (error) => setDeleteError(toApiError(error).message),
    })
  }

  const createButton = (
    <Button asChild size="sm">
      <Link href="/invoices/create">
        <Plus className="size-icon" aria-hidden="true" />
        {t('create')}
      </Link>
    </Button>
  )

  const empty =
    invoices.isError && !data ? (
      <EmptyState
        icon={CircleAlert}
        tone="danger"
        title={t('empty.errorTitle')}
        description={toApiError(invoices.error).message}
        action={
          <Button variant="outline" onClick={() => invoices.refetch()}>
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
      <EmptyState icon={FileText} title={t('empty.title')} description={t('empty.description')} action={createButton} />
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
      <PageHeader title={t('title')} subtitle={t('subtitle')} action={createButton} />

      <div className="mt-4 flex flex-col gap-4">
        <FilterBar
          density="compact"
          search={state.search}
          onSearchChange={list.setSearch}
          defaultAdvancedOpen={state.filters.overdue === '1'}
          advanced={<InvoiceOverdueFilter filters={state.filters} onChange={list.setFilter} />}
          onReset={list.reset}
          canReset={list.isFiltered}
        >
          <InvoiceInlineFilters filters={state.filters} onChange={list.setFilter} onChangeMany={list.setFilters} />
        </FilterBar>

        <DataTable
          density="relaxed"
          label={t('tableLabel')}
          columns={columns}
          rows={data?.data}
          getRowId={(invoice) => invoice.id}
          sort={state.sort}
          onSortChange={list.setSort}
          rowNumberOffset={((data?.meta.current_page ?? state.page) - 1) * (data?.meta.per_page ?? state.perPage)}
          loading={invoices.isPending}
          skeletonRows={Math.min(state.perPage, 10)}
          busy={invoices.isFetching && invoices.isPlaceholderData}
          empty={empty}
          footer={footer}
        />
      </div>

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null)
        }}
        title={t('delete.title')}
        description={deleting ? t('delete.body', { number: deleting.invoice_number, client: deleting.client?.name ?? '-' }) : ''}
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
