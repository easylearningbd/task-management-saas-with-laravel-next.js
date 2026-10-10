'use client'

import * as React from 'react'
import { SquarePen, Tag, Trash2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { RowActions } from '@/components/shared/row-actions'
import { Badge } from '@/components/ui/badge'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { toast } from '@/components/ui/toast'
import { toApiError } from '@/lib/api-error'
import { useMoney } from '@/lib/format-money'
import { useProjectItems, useProjectItemWrites } from '@/features/projects/api'
import { ItemFormModal } from '@/features/projects/components/item-form-modal'
import { TabCard, TileGridSkeleton } from '@/features/projects/components/tab-card'
import type { ProjectItem } from '@/features/projects/types'
import type { ProjectTabProps } from '@/features/projects/tabs/registry'

/* The Items tab (PAGE SPEC C and the Items screenshot): a card titled "Project Items" with a
   green "+ Add Item"; a two-column grid (one column on phones) of item tiles — a 1px `border`
   on `radius-lg` (Card.md: cards never nest in cards), each with the item name (`title-row`),
   its description (muted), a green "Active" badge (`success`; gray `neutral` if inactive),
   "Unit: hours" (muted), the price (`money`, font-mono, bold) right-aligned, and edit + delete
   icons top-right. Items belong to the project (`project_items`, not a company catalog).
   Every change refreshes the tab count (the project's cache). */

type FormState = { key: number; open: boolean; item: ProjectItem | null }

export function ItemsTab({ project }: ProjectTabProps) {
  const t = useTranslations('projects.items')
  const items = useProjectItems(project.id)
  const { remove } = useProjectItemWrites(project.id)
  const [form, setForm] = React.useState<FormState>({ key: 0, open: false, item: null })
  const [deleting, setDeleting] = React.useState<ProjectItem | null>(null)
  const [deleteError, setDeleteError] = React.useState<string | null>(null)

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

  const list = items.data ?? []

  return (
    <>
      <TabCard
        title={t('title')}
        addLabel={t('add')}
        onAdd={() => setForm((f) => ({ key: f.key + 1, open: true, item: null }))}
        query={items}
        isEmpty={list.length === 0}
        empty={{ icon: Tag, title: t('empty.title'), description: t('empty.description') }}
        skeleton={<TileGridSkeleton />}
      >
        <ul aria-label={t('title')} className="grid grid-cols-1 gap-4 p-card md:grid-cols-2">
          {list.map((item) => (
            <li key={item.id}>
              <ItemTile
                item={item}
                onEdit={() => setForm((f) => ({ key: f.key + 1, open: true, item }))}
                onDelete={() => {
                  setDeleteError(null)
                  setDeleting(item)
                }}
              />
            </li>
          ))}
        </ul>
      </TabCard>

      <ItemFormModal
        key={form.key}
        open={form.open}
        onOpenChange={(open) => setForm((f) => ({ ...f, open }))}
        projectId={project.id}
        item={form.item}
      />

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null)
        }}
        title={t('delete.title')}
        description={deleting ? t('delete.body', { name: deleting.name }) : ''}
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

function ItemTile({ item, onEdit, onDelete }: { item: ProjectItem; onEdit: () => void; onDelete: () => void }) {
  const t = useTranslations('projects.items')
  const money = useMoney()

  return (
    <article className="flex h-full flex-col rounded-lg border border-border p-4">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-title-row break-words">{item.name}</h3>
          {item.description ? <p className="mt-1 text-body-sm text-muted-foreground break-words">{item.description}</p> : null}
        </div>
        <RowActions
          className="-mt-1 -mr-1 shrink-0"
          actions={[
            { id: 'edit', label: t('actions.edit', { name: item.name }), tooltip: t('actions.editTip'), icon: SquarePen, onClick: onEdit },
            { id: 'delete', label: t('actions.delete', { name: item.name }), tooltip: t('actions.deleteTip'), icon: Trash2, tone: 'danger', onClick: onDelete },
          ]}
        />
      </div>
      <div className="mt-auto flex flex-wrap items-end justify-between gap-x-3 gap-y-2 pt-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <Badge tone={item.status === 'active' ? 'success' : 'neutral'} outlined>
            {item.status_label}
          </Badge>
          <span className="text-body-sm text-muted-foreground">{t('unit', { unit: item.unit_label })}</span>
        </div>
        <span className="font-mono text-money font-bold">{money(item.default_price)}</span>
      </div>
    </article>
  )
}
