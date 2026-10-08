'use client'

import * as React from 'react'
import { Lock, LockOpen, SquarePen, Trash2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import type { RowAction } from '@/components/shared/row-actions'
import type { ExpenseCategory } from '@/features/expense-categories/types'

/* The three row actions, in the Expense Categories screenshot's order: lock · pencil · trash.
   Icons from brand-book.md: Lock (access), SquarePen (edit), Trash2 (always last). The lock
   shows the action it performs: Lock = "Deactivate" on an active category, LockOpen =
   "Activate" on an inactive one (the Clients / Companies convention). */

export type ExpenseCategoryActionHandlers = {
  onToggleStatus: (category: ExpenseCategory) => void
  onEdit: (category: ExpenseCategory, trigger: HTMLElement | null) => void
  onDelete: (category: ExpenseCategory) => void
}

export function useExpenseCategoryActions({
  onToggleStatus,
  onEdit,
  onDelete,
}: ExpenseCategoryActionHandlers): (category: ExpenseCategory) => RowAction[] {
  const t = useTranslations('expenseCategories.list.actions')

  return React.useCallback(
    (category: ExpenseCategory): RowAction[] => {
      const name = category.name
      const active = category.status === 'active'
      return [
        {
          id: 'status',
          label: active ? t('deactivate', { name }) : t('activate', { name }),
          tooltip: active ? t('deactivateTip') : t('activateTip'),
          icon: active ? Lock : LockOpen,
          onClick: () => onToggleStatus(category),
        },
        {
          id: 'edit',
          label: t('edit', { name }),
          tooltip: t('editTip'),
          icon: SquarePen,
          // The pencil itself, so focus can come back to it when the edit ends.
          onClick: () => onEdit(category, document.activeElement instanceof HTMLElement ? document.activeElement : null),
        },
        { id: 'delete', label: t('delete', { name }), tooltip: t('deleteTip'), icon: Trash2, tone: 'danger', onClick: () => onDelete(category) },
      ]
    },
    [t, onToggleStatus, onEdit, onDelete],
  )
}
