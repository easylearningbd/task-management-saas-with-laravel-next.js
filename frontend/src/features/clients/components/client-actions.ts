'use client'

import * as React from 'react'
import { Eye, Lock, LockOpen, SquarePen, Trash2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import type { RowAction } from '@/components/shared/row-actions'
import type { Client } from '@/features/clients/types'

/* The four row actions, in the Clients screenshot's order — shared by the table and the grid.
   Icons from brand-book.md: Eye (view), SquarePen (edit), Lock (access), Trash2 (always last).
   The lock shows the action it performs: Lock = "Deactivate" on an active client, LockOpen =
   "Activate" on an inactive one (the Companies lock convention). */

export type ClientActionHandlers = {
  onView: (client: Client) => void
  onEdit: (client: Client) => void
  onToggleStatus: (client: Client) => void
  onDelete: (client: Client) => void
}

export function useClientActions({ onView, onEdit, onToggleStatus, onDelete }: ClientActionHandlers): (client: Client) => RowAction[] {
  const t = useTranslations('clients.list.actions')

  return React.useCallback(
    (client: Client): RowAction[] => {
      const name = client.name
      const active = client.status === 'active'
      return [
        { id: 'view', label: t('view', { name }), tooltip: t('viewTip'), icon: Eye, onClick: () => onView(client) },
        { id: 'edit', label: t('edit', { name }), tooltip: t('editTip'), icon: SquarePen, onClick: () => onEdit(client) },
        {
          id: 'status',
          label: active ? t('deactivate', { name }) : t('activate', { name }),
          tooltip: active ? t('deactivateTip') : t('activateTip'),
          icon: active ? Lock : LockOpen,
          onClick: () => onToggleStatus(client),
        },
        { id: 'delete', label: t('delete', { name }), tooltip: t('deleteTip'), icon: Trash2, tone: 'danger', onClick: () => onDelete(client) },
      ]
    },
    [t, onView, onEdit, onToggleStatus, onDelete],
  )
}
