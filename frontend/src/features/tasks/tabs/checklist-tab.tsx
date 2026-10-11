'use client'

import * as React from 'react'
import { ListChecks } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { ChecklistRow } from '@/components/shared/checklist-row'
import { LabelledProgressBar } from '@/components/shared/labelled-progress-bar'
import { DragHandle, SortableList } from '@/components/shared/sortable-list'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from '@/components/ui/toast'
import { toApiError } from '@/lib/api-error'
import { TabCard } from '@/features/projects/components/tab-card'
import {
  useCreateChecklistItem,
  useDeleteChecklistItem,
  useReorderChecklist,
  useTaskChecklist,
  useUpdateChecklistItem,
} from '@/features/tasks/api'
import { CHECKLIST_TITLE_MAX, createChecklistItemSchema } from '@/features/tasks/schema'
import type { TaskTabProps } from '@/features/tasks/tabs/registry'
import type { TaskChecklistItem } from '@/features/tasks/types'

/* The Checklist tab (no screenshot — inferred from the app's patterns, as PAGE SPEC C asks):
   the project tabs' TabCard titled "Checklist" with a green "+ Add Item", then
   - the summary: "{done} of {total} complete" with its percentage and the green bar;
   - the items in their order, on the shared SortableList (drag by the six-dot handle, or focus
     it and use Space and the arrows) — each a ChecklistRow: checkbox · title · edit · delete;
   - "+ Add Item" opens an inline field under the list: Enter (or Add) saves and keeps it open
     for the next item, Escape (or Cancel) closes it; errors (the server's 422 too) show under it.
   Ticking is optimistic (it flips at once and rolls back if refused); a rename happens in the
   row itself; delete asks first. Checking items never changes the task's progress (business
   rule 9). Every change refreshes the Checklist (n) count. */

export function ChecklistTab({ task }: TaskTabProps) {
  const t = useTranslations('tasks.details.checklist')
  const tValidation = useTranslations('tasks.validation')
  const checklist = useTaskChecklist(task.id)
  const create = useCreateChecklistItem(task.id)
  const update = useUpdateChecklistItem(task.id)
  const remove = useDeleteChecklistItem(task.id)
  const reorder = useReorderChecklist(task.id)
  const schema = React.useMemo(() => createChecklistItemSchema(tValidation), [tValidation])

  const items = React.useMemo(() => checklist.data ?? [], [checklist.data])
  const done = items.filter((item) => item.is_completed).length
  const percent = items.length === 0 ? 0 : Math.round((done / items.length) * 100)

  // Adding
  const [adding, setAdding] = React.useState(false)
  const [draft, setDraft] = React.useState('')
  const [addError, setAddError] = React.useState<string | null>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const errorId = React.useId()

  const openAdd = () => {
    setAdding(true)
    setAddError(null)
    window.setTimeout(() => inputRef.current?.focus(), 0)
  }
  const closeAdd = () => {
    setAdding(false)
    setDraft('')
    setAddError(null)
  }
  const submitAdd = () => {
    if (create.isPending) return // one item at a time
    const parsed = schema.safeParse({ title: draft })
    if (!parsed.success) {
      setAddError(parsed.error.issues[0]?.message ?? null)
      return
    }
    setAddError(null)
    create.mutate(
      { title: parsed.data.title },
      {
        onSuccess: () => {
          setDraft('')
          toast.success(t('added'))
          inputRef.current?.focus()
        },
        onError: (error) => {
          const apiError = toApiError(error)
          setAddError(apiError.fieldErrors.title ?? apiError.message)
        },
      },
    )
  }

  // Editing, deleting
  const [editing, setEditing] = React.useState<number | null>(null)
  const [editError, setEditError] = React.useState<string | null>(null)
  const [busy, setBusy] = React.useState<number | null>(null)
  const [deleting, setDeleting] = React.useState<TaskChecklistItem | null>(null)
  const [deleteError, setDeleteError] = React.useState<string | null>(null)

  const toggle = (item: TaskChecklistItem, checked: boolean) =>
    update.mutate({ id: item.id, payload: { is_completed: checked } }, { onError: (error) => toast.error(t('toggleFailed'), toApiError(error).message) })

  const rename = (item: TaskChecklistItem, title: string) => {
    const parsed = schema.safeParse({ title })
    if (!parsed.success) {
      setEditError(parsed.error.issues[0]?.message ?? null)
      return
    }
    setBusy(item.id)
    update.mutate(
      { id: item.id, payload: { title: parsed.data.title } },
      {
        onSuccess: () => {
          setEditing(null)
          setEditError(null)
          toast.success(t('updated'))
        },
        onError: (error) => {
          const apiError = toApiError(error)
          setEditError(apiError.fieldErrors.title ?? apiError.message)
        },
        onSettled: () => setBusy(null),
      },
    )
  }

  const confirmDelete = () => {
    if (!deleting) return
    remove.mutate(deleting.id, {
      onSuccess: () => {
        setDeleting(null)
        toast.success(t('deleted'))
      },
      onError: (error) => setDeleteError(toApiError(error).message),
    })
  }

  return (
    <>
      <TabCard
        title={t('title')}
        addLabel={t('add')}
        onAdd={openAdd}
        query={checklist}
        isEmpty={items.length === 0 && !adding}
        empty={{ icon: ListChecks, title: t('empty.title'), description: t('empty.description') }}
        skeleton={<ChecklistSkeleton />}
      >
        <div className="flex flex-col gap-4 p-card">
          {items.length > 0 ? (
            <>
              <LabelledProgressBar label={t('summary', { done, total: items.length })} value={percent} />
              <SortableList
                items={items}
                getId={getItemId}
                getLabel={getItemTitle}
                label={t('listLabel')}
                className="gap-2"
                onReorder={(ids) => reorder.mutate(ids, { onError: (error) => toast.error(t('reorderFailed'), toApiError(error).message) })}
                renderItem={(item) => (
                  <ChecklistRow
                    title={item.title}
                    checked={item.is_completed}
                    onCheckedChange={(checked) => toggle(item, checked)}
                    editing={editing === item.id}
                    onEditStart={() => {
                      setEditError(null)
                      setEditing(item.id)
                    }}
                    onEditSave={(title) => rename(item, title)}
                    onEditCancel={() => {
                      setEditing(null)
                      setEditError(null)
                    }}
                    onDelete={() => {
                      setDeleteError(null)
                      setDeleting(item)
                    }}
                    maxLength={CHECKLIST_TITLE_MAX}
                    error={editing === item.id ? (editError ?? undefined) : undefined}
                    busy={busy === item.id}
                    handle={<DragHandle label={t('reorderHandle', { item: item.title })} />}
                  />
                )}
              />
            </>
          ) : null}

          {adding ? (
            <form
              noValidate
              onSubmit={(event) => {
                event.preventDefault()
                submitAdd()
              }}
              className="flex flex-col gap-1.5"
            >
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  ref={inputRef}
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Escape') {
                      event.preventDefault()
                      closeAdd()
                    }
                  }}
                  placeholder={t('inputPlaceholder')}
                  aria-label={t('inputLabel')}
                  aria-invalid={addError ? true : undefined}
                  aria-describedby={addError ? errorId : undefined}
                  maxLength={CHECKLIST_TITLE_MAX}
                  // Stays enabled while saving, so focus stays here for the next item.
                  aria-busy={create.isPending || undefined}
                  className="min-w-0 flex-1 basis-48"
                />
                <Button type="submit" size="sm" loading={create.isPending}>
                  {t('addSubmit')}
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={closeAdd} disabled={create.isPending}>
                  {t('cancel')}
                </Button>
              </div>
              {addError ? (
                <p id={errorId} className="text-body-sm text-danger">
                  {addError}
                </p>
              ) : null}
            </form>
          ) : null}
        </div>
      </TabCard>

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null)
        }}
        title={t('delete.title')}
        description={deleting ? t('delete.body', { item: deleting.title }) : ''}
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

const getItemId = (item: TaskChecklistItem) => item.id
const getItemTitle = (item: TaskChecklistItem) => item.title

function ChecklistSkeleton() {
  return (
    <div aria-hidden="true" className="flex flex-col gap-4 p-card">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-1.5 w-full" />
      {Array.from({ length: 3 }, (_, i) => (
        <Skeleton key={i} className="h-12 w-full rounded-lg" />
      ))}
    </div>
  )
}
