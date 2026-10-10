'use client'

import * as React from 'react'
import { Eye, FileText, SquarePen, Trash2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { RowActions } from '@/components/shared/row-actions'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { toast } from '@/components/ui/toast'
import { toApiError } from '@/lib/api-error'
import { useProjectNotes, useProjectNoteWrites } from '@/features/projects/api'
import { NoteFormModal, NoteMeta, NoteViewModal } from '@/features/projects/components/note-modals'
import { TabCard, TileGridSkeleton } from '@/features/projects/components/tab-card'
import type { ProjectNote } from '@/features/projects/types'
import type { ProjectTabProps } from '@/features/projects/tabs/registry'

/* The Notes tab (PAGE SPEC C and the Notes screenshot): a card titled "Notes" with a green
   "+ Add Note"; a two-column grid (one column on phones) of note tiles — the same bordered
   tiles as Project Items — each with the note title (`title-row`), a blue soft badge with the
   author's name, a Calendar glyph with the date, and eye + edit + delete icons. The body is not
   on the card: the eye opens the View modal. Newest first. Every change refreshes the tab count
   (the project's cache). */

type FormState = { key: number; open: boolean; note: ProjectNote | null }

export function NotesTab({ project }: ProjectTabProps) {
  const t = useTranslations('projects.notes')
  const notes = useProjectNotes(project.id)
  const { remove } = useProjectNoteWrites(project.id)
  const [form, setForm] = React.useState<FormState>({ key: 0, open: false, note: null })
  const [viewing, setViewing] = React.useState<{ open: boolean; note: ProjectNote | null }>({ open: false, note: null })
  const [deleting, setDeleting] = React.useState<ProjectNote | null>(null)
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

  const list = notes.data ?? []

  return (
    <>
      <TabCard
        title={t('title')}
        addLabel={t('add')}
        onAdd={() => setForm((f) => ({ key: f.key + 1, open: true, note: null }))}
        query={notes}
        isEmpty={list.length === 0}
        empty={{ icon: FileText, title: t('empty.title'), description: t('empty.description') }}
        skeleton={<TileGridSkeleton />}
      >
        <ul aria-label={t('title')} className="grid grid-cols-1 gap-4 p-card md:grid-cols-2">
          {list.map((note) => (
            <li key={note.id}>
              <article className="flex h-full items-start gap-3 rounded-lg border border-border p-4">
                <div className="min-w-0 flex-1">
                  <h3 className="text-title-row break-words">{note.title}</h3>
                  <div className="mt-2">
                    <NoteMeta note={note} />
                  </div>
                </div>
                <RowActions
                  className="-mt-1 -mr-1 shrink-0"
                  actions={[
                    { id: 'view', label: t('actions.view', { title: note.title }), tooltip: t('actions.viewTip'), icon: Eye, onClick: () => setViewing({ open: true, note }) },
                    {
                      id: 'edit',
                      label: t('actions.edit', { title: note.title }),
                      tooltip: t('actions.editTip'),
                      icon: SquarePen,
                      onClick: () => setForm((f) => ({ key: f.key + 1, open: true, note })),
                    },
                    {
                      id: 'delete',
                      label: t('actions.delete', { title: note.title }),
                      tooltip: t('actions.deleteTip'),
                      icon: Trash2,
                      tone: 'danger',
                      onClick: () => {
                        setDeleteError(null)
                        setDeleting(note)
                      },
                    },
                  ]}
                />
              </article>
            </li>
          ))}
        </ul>
      </TabCard>

      <NoteFormModal key={form.key} open={form.open} onOpenChange={(open) => setForm((f) => ({ ...f, open }))} projectId={project.id} note={form.note} />

      <NoteViewModal open={viewing.open} onOpenChange={(open) => setViewing((v) => ({ ...v, open }))} projectId={project.id} note={viewing.note} />

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null)
        }}
        title={t('delete.title')}
        description={deleting ? t('delete.body', { title: deleting.title }) : ''}
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
