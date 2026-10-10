'use client'

import * as React from 'react'
import { Eye, Lock, LockOpen, SquarePen, Trash2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import type { RowAction } from '@/components/shared/row-actions'
import type { Project } from '@/features/projects/types'

/* The four row actions of the Projects screenshot — shared by the table and the grid: Eye (the
   details page), SquarePen (edit), Lock (Active ⇄ Inactive), Trash2 (always last).
   The lock shows the action it performs (Lock = "Deactivate" on an active project, LockOpen =
   "Activate" on an inactive one). On Completed and On Hold it refuses with a tooltip saying
   why (`can_toggle` from the API) instead of silently overwriting the status.
   `onView` absent → the eye says "Coming soon" (for a caller with no details page to open;
   nothing may land on a 404). */

export type ProjectActionHandlers = {
  onView?: (project: Project) => void
  onEdit: (project: Project) => void
  onToggleStatus: (project: Project) => void
  onDelete: (project: Project) => void
}

export function useProjectActions({ onView, onEdit, onToggleStatus, onDelete }: ProjectActionHandlers): (project: Project) => RowAction[] {
  const t = useTranslations('projects.list.actions')
  const tShared = useTranslations('shared')

  return React.useCallback(
    (project: Project): RowAction[] => {
      const name = project.name
      const active = project.status === 'active'
      return [
        {
          id: 'view',
          label: t('view', { name }),
          tooltip: t('viewTip'),
          icon: Eye,
          onClick: () => onView?.(project),
          disabledReason: onView ? undefined : tShared('comingSoon'),
        },
        { id: 'edit', label: t('edit', { name }), tooltip: t('editTip'), icon: SquarePen, onClick: () => onEdit(project) },
        {
          id: 'status',
          label: !project.can_toggle ? t('switchStatus', { name }) : active ? t('deactivate', { name }) : t('activate', { name }),
          tooltip: active ? t('deactivateTip') : t('activateTip'),
          icon: active || !project.can_toggle ? Lock : LockOpen,
          onClick: () => onToggleStatus(project),
          disabledReason: project.can_toggle ? undefined : t('toggleRefused', { status: project.status_label }),
        },
        { id: 'delete', label: t('delete', { name }), tooltip: t('deleteTip'), icon: Trash2, tone: 'danger', onClick: () => onDelete(project) },
      ]
    },
    [t, tShared, onView, onEdit, onToggleStatus, onDelete],
  )
}
