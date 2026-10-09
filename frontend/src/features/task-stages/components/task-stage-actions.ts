'use client'

import * as React from 'react'
import { Eye, Lock, LockOpen, SquarePen, Trash2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import type { RowAction } from '@/components/shared/row-actions'
import type { TaskStage } from '@/features/task-stages/types'

/* The four stage-card actions, in the Task Stages screenshot's order: eye · pencil · lock ·
   trash. Icons from brand-book.md: Eye (view), SquarePen (edit), Lock (access), Trash2 (always
   last). The lock shows the action it performs: Lock = "Deactivate" on an active stage,
   LockOpen = "Activate" on an inactive one (the Clients / Companies convention). Nothing is
   hidden or pre-disabled for the done stage: the server refuses with its own message. */

export type TaskStageActionHandlers = {
  onView: (stage: TaskStage) => void
  onEdit: (stage: TaskStage) => void
  onToggleStatus: (stage: TaskStage) => void
  onDelete: (stage: TaskStage) => void
}

export function useTaskStageActions({ onView, onEdit, onToggleStatus, onDelete }: TaskStageActionHandlers): (stage: TaskStage) => RowAction[] {
  const t = useTranslations('taskStages.list.actions')

  return React.useCallback(
    (stage: TaskStage): RowAction[] => {
      const name = stage.name
      const active = stage.status === 'active'
      return [
        { id: 'view', label: t('view', { name }), tooltip: t('viewTip'), icon: Eye, onClick: () => onView(stage) },
        { id: 'edit', label: t('edit', { name }), tooltip: t('editTip'), icon: SquarePen, onClick: () => onEdit(stage) },
        {
          id: 'status',
          label: active ? t('deactivate', { name }) : t('activate', { name }),
          tooltip: active ? t('deactivateTip') : t('activateTip'),
          icon: active ? Lock : LockOpen,
          onClick: () => onToggleStatus(stage),
        },
        { id: 'delete', label: t('delete', { name }), tooltip: t('deleteTip'), icon: Trash2, tone: 'danger', onClick: () => onDelete(stage) },
      ]
    },
    [t, onView, onEdit, onToggleStatus, onDelete],
  )
}
