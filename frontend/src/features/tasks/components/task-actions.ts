'use client'

import * as React from 'react'
import { Eye, SquarePen, Trash2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import type { RowAction } from '@/components/shared/row-actions'
import type { Task } from '@/features/tasks/types'

/* A task's three actions — shared by the card's "…" menu and the list's row actions:
   View (Eye, the details page) · Edit (SquarePen, the task modal) · Delete (Trash2, last).
   A handler left out makes its action say "Coming soon" instead of doing nothing silently
   (nothing may land on a 404 or a missing modal). Each action also carries a short label
   (`short`) for the menu, where the record is already in the menu's own name. */

export type TaskAction = RowAction & { short: string }

export type TaskActionHandlers = {
  onView?: (task: Task) => void
  onEdit?: (task: Task) => void
  onDelete: (task: Task) => void
}

export function useTaskActions({ onView, onEdit, onDelete }: TaskActionHandlers): (task: Task) => TaskAction[] {
  const t = useTranslations('tasks.list.actions')
  const tShared = useTranslations('shared')

  return React.useCallback(
    (task: Task): TaskAction[] => {
      const title = task.title
      return [
        {
          id: 'view',
          label: t('view', { title }),
          short: t('viewShort'),
          tooltip: t('viewTip'),
          icon: Eye,
          onClick: () => onView?.(task),
          disabledReason: onView ? undefined : tShared('comingSoon'),
        },
        {
          id: 'edit',
          label: t('edit', { title }),
          short: t('editShort'),
          tooltip: t('editTip'),
          icon: SquarePen,
          onClick: () => onEdit?.(task),
          disabledReason: onEdit ? undefined : tShared('comingSoon'),
        },
        {
          id: 'delete',
          label: t('delete', { title }),
          short: t('deleteShort'),
          tooltip: t('deleteTip'),
          icon: Trash2,
          tone: 'danger',
          onClick: () => onDelete(task),
        },
      ]
    },
    [t, tShared, onView, onEdit, onDelete],
  )
}
