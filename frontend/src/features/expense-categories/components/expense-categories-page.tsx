'use client'

import * as React from 'react'
import { CircleAlert, Inbox, Search } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { PageHeader } from '@/components/layout/app-shell'
import { DataTable } from '@/components/shared/data-table'
import { Pagination } from '@/components/shared/pagination'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { EmptyState } from '@/components/ui/empty-state'
import { toast } from '@/components/ui/toast'
import { useDeleteExpenseCategory, useExpenseCategories, useToggleExpenseCategoryStatus } from '@/features/expense-categories/api'
import { useExpenseCategoryActions } from '@/features/expense-categories/components/expense-category-actions'
import { useExpenseCategoryColumns } from '@/features/expense-categories/components/expense-category-columns'
import { ExpenseCategoryFormCard } from '@/features/expense-categories/components/expense-category-form-card'
import { ExpenseCategorySearchCard } from '@/features/expense-categories/components/expense-category-search-card'
import type { ExpenseCategory } from '@/features/expense-categories/types'
import { useExpenseCategoryListParams } from '@/features/expense-categories/use-expense-category-list-params'
import { toApiError } from '@/lib/api-error'

/* /configuration/expense-categories — the Expense Categories screenshot, deliberately NOT the
   standard list page: no header button, no modal, no view toggle, no `#` column. The header
   (title + subtitle), then two columns — the form card (a third) and, beside it, the search
   card above the table card (two thirds); stacked on smaller screens with the form first.
   - The form creates; a row's pencil loads that row into it (edit mode, the row highlighted).
     Update or Cancel puts it back in create mode and focus back on that pencil. On small
     screens the form scrolls into view when an edit starts.
   - Lock: optimistic status toggle with a toast (rolled back on failure). Delete: a confirm
     naming the category; deleting the category being edited resets the form.
   - Search is explicit (Search / Enter); the status select applies at once. All list state
     lives in the URL. The pagination footer only appears when there is more than one page. */

/** Below Tailwind's `lg`, the columns stack. */
const STACKED = '(max-width: 1023.98px)'

export function ExpenseCategoriesPage() {
  const t = useTranslations('expenseCategories.list')
  const tPage = useTranslations('expenseCategories.page')
  const list = useExpenseCategoryListParams()
  const { state, params, setPage } = list
  const categories = useExpenseCategories(params)
  const remove = useDeleteExpenseCategory()
  const { mutate: toggleStatus } = useToggleExpenseCategoryStatus()

  // The form: which category it edits (null = create) and a key that remounts it fresh.
  const [form, setForm] = React.useState<{ key: number; editing: ExpenseCategory | null }>({ key: 0, editing: null })
  const formCardRef = React.useRef<HTMLDivElement>(null)
  const nameRef = React.useRef<HTMLInputElement | null>(null)
  // Where focus goes once the remounted form is on screen: the name field, or the pencil that
  // started an edit.
  const pendingFocus = React.useRef<'name' | HTMLElement | null>(null)
  const editTrigger = React.useRef<HTMLElement | null>(null)

  React.useEffect(() => {
    const target = pendingFocus.current
    pendingFocus.current = null
    if (target === null) return
    if (target !== 'name' && target.isConnected) {
      target.focus()
      return
    }
    if (window.matchMedia(STACKED).matches) {
      const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches
      formCardRef.current?.scrollIntoView({ block: 'start', behavior: smooth ? 'smooth' : 'auto' })
    }
    nameRef.current?.focus({ preventScroll: true })
  }, [form.key])

  const startEdit = React.useCallback((category: ExpenseCategory, trigger: HTMLElement | null) => {
    editTrigger.current = trigger
    pendingFocus.current = 'name'
    setForm((f) => ({ key: f.key + 1, editing: category }))
  }, [])

  /** Back to create mode; focus returns to the pencil that started the edit when it can. */
  const endEdit = React.useCallback((returnFocus: boolean) => {
    pendingFocus.current = returnFocus && editTrigger.current ? editTrigger.current : 'name'
    editTrigger.current = null
    setForm((f) => ({ key: f.key + 1, editing: null }))
  }, [])

  const onSaved = React.useCallback(() => {
    if (form.editing) endEdit(true)
    else {
      // Ready for the next one: a clean form, the cursor in Category Name.
      pendingFocus.current = 'name'
      setForm((f) => ({ key: f.key + 1, editing: null }))
    }
  }, [form.editing, endEdit])

  const [deleting, setDeleting] = React.useState<ExpenseCategory | null>(null)
  const [deleteError, setDeleteError] = React.useState<string | null>(null)

  const actionsFor = useExpenseCategoryActions({
    onToggleStatus: React.useCallback(
      (category: ExpenseCategory) =>
        toggleStatus(category.id, {
          onSuccess: (updated) => {
            toast.success(updated.status === 'active' ? t('status.activated') : t('status.deactivated'))
            // The form editing this category shows its new status (other edits are kept).
            setForm((f) => (f.editing?.id === updated.id ? { ...f, editing: updated } : f))
          },
          onError: (error) => {
            const apiError = toApiError(error)
            toast.error(t('status.failed'), apiError.status === 0 ? undefined : apiError.message)
          },
        }),
      [toggleStatus, t],
    ),
    onEdit: startEdit,
    onDelete: React.useCallback((category: ExpenseCategory) => {
      setDeleteError(null)
      setDeleting(category)
    }, []),
  })

  const columns = useExpenseCategoryColumns(actionsFor)

  const confirmDelete = () => {
    if (!deleting) return
    const id = deleting.id
    remove.mutate(id, {
      onSuccess: () => {
        setDeleting(null)
        toast.success(t('delete.deleted'))
        if (form.editing?.id === id) endEdit(false)
      },
      onError: (error) => setDeleteError(toApiError(error).message),
    })
  }

  // A page past the end (e.g. after deleting the last row of the last page) → the last page.
  const data = categories.data
  const lastPage = data?.meta.last_page
  React.useEffect(() => {
    if (lastPage !== undefined && !categories.isPlaceholderData && state.page > lastPage) setPage(lastPage)
  }, [lastPage, categories.isPlaceholderData, state.page, setPage])

  const empty =
    categories.isError && !data ? (
      <EmptyState
        icon={CircleAlert}
        tone="danger"
        title={t('empty.errorTitle')}
        description={toApiError(categories.error).message}
        action={
          <Button variant="outline" onClick={() => categories.refetch()}>
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
      <EmptyState icon={Inbox} title={t('empty.title')} description={t('empty.description')} />
    )

  // Only when there is somewhere to go: five categories show no footer, as in the screenshot.
  const footer =
    data && data.meta.last_page > 1 ? (
      <Pagination
        page={data.meta.current_page}
        perPage={data.meta.per_page}
        total={data.meta.total}
        onPageChange={list.setPage}
        onPerPageChange={list.setPerPage}
      />
    ) : null

  const editingId = form.editing?.id

  return (
    <>
      <PageHeader title={tPage('title')} subtitle={tPage('subtitle')} />

      <div className="mt-4 grid grid-cols-1 gap-x-6 gap-y-4 lg:grid-cols-3 lg:items-start">
        <div ref={formCardRef} className="scroll-mt-4 lg:col-span-1">
          <ExpenseCategoryFormCard
            key={form.key}
            category={form.editing}
            onSaved={onSaved}
            onCancel={() => endEdit(true)}
            nameRef={nameRef}
          />
        </div>

        <div className="flex min-w-0 flex-col gap-4 lg:col-span-2">
          <ExpenseCategorySearchCard
            search={state.search}
            status={state.filters.status}
            onSearch={list.setSearch}
            onStatusChange={(value) => list.setFilter('status', value)}
          />

          <DataTable
            label={t('tableLabel')}
            columns={columns}
            rows={data?.data}
            getRowId={(category) => category.id}
            sort={state.sort}
            onSortChange={list.setSort}
            loading={categories.isPending}
            skeletonRows={5}
            busy={categories.isFetching && categories.isPlaceholderData}
            empty={empty}
            footer={footer}
            isRowSelected={editingId === undefined ? undefined : (category) => category.id === editingId}
          />
        </div>
      </div>

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null)
        }}
        title={t('delete.title')}
        description={deleting ? t('delete.body', { name: deleting.name }) : ''}
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
