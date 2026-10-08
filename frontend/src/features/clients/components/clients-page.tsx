'use client'

import * as React from 'react'
import { CircleAlert, Inbox, Plus, Search } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { PageHeader } from '@/components/layout/app-shell'
import { CardGrid } from '@/components/shared/card-grid'
import { DataTable } from '@/components/shared/data-table'
import { FilterBar } from '@/components/shared/filter-bar'
import { Pagination } from '@/components/shared/pagination'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { EmptyState } from '@/components/ui/empty-state'
import { toast } from '@/components/ui/toast'
import { ViewToggle } from '@/components/ui/view-toggle'
import { useClients, useDeleteClient, useToggleClientStatus } from '@/features/clients/api'
import { useClientActions } from '@/features/clients/components/client-actions'
import { ClientCard, ClientCardSkeleton } from '@/features/clients/components/client-card'
import { ClientDetailsModal } from '@/features/clients/components/client-details-modal'
import { useClientColumns } from '@/features/clients/components/client-columns'
import { ClientCreatedFilter, ClientStatusFilter } from '@/features/clients/components/client-filters'
import { ClientFormModal } from '@/features/clients/components/client-form-modal'
import type { Client } from '@/features/clients/types'
import { useClientListParams } from '@/features/clients/use-client-list-params'
import { toApiError } from '@/lib/api-error'

/* /clients — PAGE SPEC A and the Clients screenshot: the header (title, subtitle, green
   "+ Add Client"), the filter bar card (search · All Status · Filters → Created At range +
   Reset · list/grid toggle), then the table (or the grid) with its footer. All list state —
   the view included — lives in the URL. Lock: optimistic status toggle with a toast (rolled
   back on failure). Delete: a confirm naming the client. Add / Edit share ClientFormModal;
   the eye opens ClientDetailsModal. Each keeps its record while it animates closed. */

type FormState = { key: number; open: boolean; client: Client | null }
type DetailsState = { open: boolean; client: Client | null }

export function ClientsPage() {
  const t = useTranslations('clients.list')
  const list = useClientListParams()
  const { state, params, setPage, view, setView } = list
  const clients = useClients(params)
  const remove = useDeleteClient()
  const { mutate: toggleStatus } = useToggleClientStatus()

  const [deleting, setDeleting] = React.useState<Client | null>(null)
  const [deleteError, setDeleteError] = React.useState<string | null>(null)
  // Add / Edit share one modal; a new key per opening gives a fresh form every time.
  const [form, setForm] = React.useState<FormState>({ key: 0, open: false, client: null })
  const [details, setDetails] = React.useState<DetailsState>({ open: false, client: null })

  const openCreate = React.useCallback(() => setForm((f) => ({ key: f.key + 1, open: true, client: null })), [])

  const actionsFor = useClientActions({
    onView: React.useCallback((client: Client) => setDetails({ open: true, client }), []),
    onEdit: React.useCallback((client: Client) => setForm((f) => ({ key: f.key + 1, open: true, client })), []),
    onToggleStatus: React.useCallback(
      (client: Client) =>
        toggleStatus(client.id, {
          onSuccess: (updated) => toast.success(updated.status === 'active' ? t('status.activated') : t('status.deactivated')),
          onError: (error) => {
            const apiError = toApiError(error)
            toast.error(t('status.failed'), apiError.status === 0 ? undefined : apiError.message)
          },
        }),
      [toggleStatus, t],
    ),
    onDelete: React.useCallback((client: Client) => {
      setDeleteError(null)
      setDeleting(client)
    }, []),
  })

  const columns = useClientColumns(actionsFor)

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
  const data = clients.data
  const lastPage = data?.meta.last_page
  React.useEffect(() => {
    if (lastPage !== undefined && !clients.isPlaceholderData && state.page > lastPage) setPage(lastPage)
  }, [lastPage, clients.isPlaceholderData, state.page, setPage])

  const empty =
    clients.isError && !data ? (
      <EmptyState
        icon={CircleAlert}
        tone="danger"
        title={t('empty.errorTitle')}
        description={toApiError(clients.error).message}
        action={
          <Button variant="outline" onClick={() => clients.refetch()}>
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
          defaultAdvancedOpen={state.filters.created_from !== '' || state.filters.created_to !== ''}
          advanced={<ClientCreatedFilter filters={state.filters} onChange={list.setFilter} />}
          onReset={list.reset}
          canReset={list.isFiltered}
          actions={
            <ViewToggle value={view} onValueChange={setView} label={t('view.label')} listLabel={t('view.list')} gridLabel={t('view.grid')} />
          }
        >
          <ClientStatusFilter filters={state.filters} onChange={list.setFilter} />
        </FilterBar>

        {view === 'grid' ? (
          <CardGrid
            label={t('gridLabel')}
            items={data?.data}
            getId={(client) => client.id}
            renderCard={(client) => <ClientCard client={client} actions={actionsFor(client)} />}
            renderSkeleton={() => <ClientCardSkeleton />}
            skeletonCount={Math.min(state.perPage, 6)}
            loading={clients.isPending}
            busy={clients.isFetching && clients.isPlaceholderData}
            empty={empty}
            footer={footer}
          />
        ) : (
          <DataTable
            density="relaxed"
            label={t('tableLabel')}
            columns={columns}
            rows={data?.data}
            getRowId={(client) => client.id}
            sort={state.sort}
            onSortChange={list.setSort}
            rowNumberOffset={((data?.meta.current_page ?? state.page) - 1) * (data?.meta.per_page ?? state.perPage)}
            loading={clients.isPending}
            skeletonRows={Math.min(state.perPage, 10)}
            busy={clients.isFetching && clients.isPlaceholderData}
            empty={empty}
            footer={footer}
          />
        )}
      </div>

      <ClientFormModal
        key={form.key}
        open={form.open}
        onOpenChange={(open) => setForm((f) => ({ ...f, open }))}
        client={form.client}
      />

      <ClientDetailsModal
        open={details.open}
        onOpenChange={(open) => setDetails((d) => ({ ...d, open }))}
        client={details.client}
      />

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null)
        }}
        title={t('delete.title')}
        description={deleting ? t('delete.body', { name: deleting.name, email: deleting.email }) : ''}
        confirmLabel={t('delete.confirm')}
        cancelLabel={t('dialog.cancel')}
        closeLabel={t('dialog.close')}
        onConfirm={confirmDelete}
        pending={remove.isPending}
        error={deleteError}
      />
    </>
  )
}
