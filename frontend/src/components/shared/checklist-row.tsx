'use client'

import * as React from 'react'
import { Check, Pencil, Trash2, X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Tooltip } from '@/components/ui/tooltip'
import { cn } from '@/lib/cn'

/* One line of a checklist — generic (a task's checklist today): [handle] · checkbox · title ·
   edit + delete icon buttons, on a `card` row with a 1px `border` and `radius-lg`.
   - The title is the checkbox's label (a click on it toggles). A ticked item reads
     `muted-foreground` and struck through.
   - `handle`: a slot for SortableList's <DragHandle /> when the list reorders.
   - Editing happens in place: the title becomes an Input (focused, text selected) with Save
     (Check) and Cancel (X); Enter saves, Escape cancels. An empty or unchanged title doesn't
     save. `error` shows under the field (the server's 422).
   - `busy` dims the row and blocks its controls while a write is in flight.
   The icon buttons are the ghost `icon-sm` buttons of RowActions, with tooltips repeating their
   aria-labels; delete turns `danger` on hover, as Detach does on the files tab. */
export function ChecklistRow({
  title,
  checked,
  onCheckedChange,
  editing,
  onEditStart,
  onEditSave,
  onEditCancel,
  onDelete,
  maxLength,
  error,
  busy = false,
  handle,
  className,
}: {
  title: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  editing: boolean
  onEditStart: () => void
  /** The trimmed new title (never empty, never the old one). */
  onEditSave: (title: string) => void
  onEditCancel: () => void
  onDelete: () => void
  maxLength?: number
  /** Under the edit field. */
  error?: string
  busy?: boolean
  handle?: React.ReactNode
  className?: string
}) {
  const t = useTranslations('shared.checklist')
  const checkboxId = React.useId()
  const errorId = React.useId()
  const [draft, setDraft] = React.useState(title)

  // Each edit starts from the current title.
  const [wasEditing, setWasEditing] = React.useState(editing)
  if (editing !== wasEditing) {
    setWasEditing(editing)
    if (editing) setDraft(title)
  }

  const save = () => {
    const next = draft.trim()
    if (next === '' || next === title) {
      onEditCancel()
      return
    }
    onEditSave(next)
  }

  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2',
        busy && 'opacity-disabled',
        className,
      )}
      aria-busy={busy || undefined}
    >
      {handle}
      <Checkbox
        id={checkboxId}
        checked={checked}
        onCheckedChange={(value) => onCheckedChange(value === true)}
        disabled={busy || editing}
        aria-label={editing ? title : undefined}
      />

      {editing ? (
        <div className="min-w-0 flex-1">
          <Input
            autoFocus
            onFocus={(event) => event.currentTarget.select()}
            value={draft}
            maxLength={maxLength}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                save()
              } else if (event.key === 'Escape') {
                event.preventDefault()
                event.stopPropagation()
                onEditCancel()
              }
            }}
            aria-label={t('editField', { item: title })}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            disabled={busy}
          />
          {error ? (
            <p id={errorId} className="mt-1 text-body-sm text-danger">
              {error}
            </p>
          ) : null}
        </div>
      ) : (
        <label
          htmlFor={checkboxId}
          className={cn('min-w-0 flex-1 cursor-pointer text-body break-words', checked && 'text-muted-foreground line-through')}
        >
          {title}
        </label>
      )}

      <div className="flex shrink-0 items-center gap-1">
        {editing ? (
          <>
            <IconAction label={t('save')} onClick={save} disabled={busy}>
              <Check className="size-icon" aria-hidden="true" />
            </IconAction>
            <IconAction label={t('cancel')} onClick={onEditCancel} disabled={busy}>
              <X className="size-icon" aria-hidden="true" />
            </IconAction>
          </>
        ) : (
          <>
            <IconAction label={t('edit', { item: title })} tooltip={t('editShort')} onClick={onEditStart} disabled={busy}>
              <Pencil className="size-icon" aria-hidden="true" />
            </IconAction>
            <IconAction
              label={t('delete', { item: title })}
              tooltip={t('deleteShort')}
              onClick={onDelete}
              disabled={busy}
              className="hover:bg-danger-soft hover:text-danger"
            >
              <Trash2 className="size-icon" aria-hidden="true" />
            </IconAction>
          </>
        )}
      </div>
    </div>
  )
}

function IconAction({
  label,
  tooltip,
  onClick,
  disabled,
  className,
  children,
}: {
  label: string
  tooltip?: string
  onClick: () => void
  disabled?: boolean
  className?: string
  children: React.ReactNode
}) {
  return (
    <Tooltip content={tooltip ?? label}>
      <Button variant="ghost" size="icon-sm" aria-label={label} onClick={onClick} disabled={disabled} className={className}>
        {children}
      </Button>
    </Tooltip>
  )
}
