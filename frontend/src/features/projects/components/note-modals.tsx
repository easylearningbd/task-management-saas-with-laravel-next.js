'use client'

import * as React from 'react'
import { useForm, type FieldPath } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Calendar, FileText } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { DetailsModal } from '@/components/shared/details-modal'
import { TextareaField } from '@/components/shared/form-fields'
import { FormModal } from '@/components/shared/form-modal'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from '@/components/ui/toast'
import { TextField } from '@/features/auth/components/text-field'
import { useAuthFormError } from '@/features/auth/components/use-auth-form-error'
import { useProjectNote, useProjectNoteWrites } from '@/features/projects/api'
import { useLocalDate } from '@/features/projects/format'
import { createNoteSchema, EMPTY_NOTE_FORM, noteToFormValues, toNotePayload, type NoteFormValues } from '@/features/projects/schema'
import type { ProjectNote } from '@/features/projects/types'

/* The Notes tab's two modals (no screenshots — inferred, PAGE SPEC C):
   - Add / Edit Note: the 468px form modal — Title* ("enter title"), Content* (a textarea,
     "enter content"); Cancel · Save. The author is the signed-in user, set by the server.
   - View Note: DetailsModal (FileText glyph in the `primary-soft` tile, the note's title as the
     heading) — the author as a blue soft badge, the date behind a Calendar glyph, then the full
     content with its line breaks kept. Seeded from the card, then refreshed from the API. */

const FIELDS = ['title', 'content'] as const satisfies ReadonlyArray<FieldPath<NoteFormValues>>

export function NoteFormModal({
  open,
  onOpenChange,
  projectId,
  note,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: number
  /** Edit this note; null to add one. */
  note: ProjectNote | null
}) {
  const t = useTranslations('projects.notes.form')
  const tValidation = useTranslations('projects.validation')
  const isEdit = note !== null
  const { create, update } = useProjectNoteWrites(projectId)

  const schema = React.useMemo(() => createNoteSchema(tValidation), [tValidation])
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isDirty },
  } = useForm<NoteFormValues>({
    resolver: zodResolver(schema),
    defaultValues: note ? noteToFormValues(note) : EMPTY_NOTE_FORM,
  })
  const { formError, setFormError, handleError } = useAuthFormError(setError, FIELDS)

  const onSubmit = (values: NoteFormValues) => {
    setFormError(null)
    const payload = toNotePayload(values)
    const done = {
      onSuccess: () => {
        toast.success(isEdit ? t('updated') : t('created'))
        onOpenChange(false)
      },
      onError: handleError,
    }
    if (note) update.mutate({ id: note.id, payload }, done)
    else create.mutate(payload, done)
  }

  return (
    <FormModal
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? t('editTitle') : t('createTitle')}
      onSubmit={handleSubmit(onSubmit)}
      submitLabel={t('save')}
      cancelLabel={t('cancel')}
      pending={create.isPending || update.isPending}
      dirty={isDirty}
      error={formError}
      size="sm"
      divided
    >
      <div className="flex flex-col gap-4.5">
        <TextField label={t('title')} placeholder={t('titlePlaceholder')} required autoComplete="off" error={errors.title?.message} {...register('title')} />
        <TextareaField
          label={t('content')}
          placeholder={t('contentPlaceholder')}
          required
          rows={8}
          error={errors.content?.message}
          {...register('content')}
        />
      </div>
    </FormModal>
  )
}

export function NoteViewModal({
  open,
  onOpenChange,
  projectId,
  note,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: number
  note: ProjectNote | null
}) {
  const query = useProjectNote(projectId, open ? (note?.id ?? null) : null, { initialData: note ?? undefined })
  const shown = query.data ?? note

  return (
    <DetailsModal open={open} onOpenChange={onOpenChange} title={shown?.title ?? ''} icon={FileText} size="md" divided>
      {shown ? (
        <div className="flex flex-col gap-4">
          <NoteMeta note={shown} />
          <p className="text-body whitespace-pre-line break-words">{shown.content}</p>
        </div>
      ) : (
        <Skeleton className="h-24 w-full" />
      )}
    </DetailsModal>
  )
}

/** The author (blue soft badge) and the date (Calendar glyph, `muted-foreground-alt`). */
export function NoteMeta({ note }: { note: ProjectNote }) {
  const t = useTranslations('projects.notes')
  const date = useLocalDate(note.created_at)

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
      <Badge tone="info" outlined className="max-w-full">
        <span className="truncate">{note.author?.name ?? t('unknownAuthor')}</span>
      </Badge>
      <div className="inline-flex items-center gap-1.5 text-body-sm text-muted-foreground-alt tabular-nums">
        <Calendar className="size-3.5 shrink-0" aria-hidden="true" />
        {date ?? <Skeleton className="h-4 w-20" />}
      </div>
    </div>
  )
}
