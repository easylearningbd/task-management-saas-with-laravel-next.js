'use client'

import * as React from 'react'
import { ArrowUpRight, CreditCard, Info, KeyRound, Lock, LockOpen, SquarePen, Trash2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import type { RowAction } from '@/components/shared/row-actions'
import type { Company } from '@/features/companies/types'

/* The seven row actions, in the screenshot's order — shared by the table and the grid so both
   do exactly the same thing. Icons from brand-book.md: ArrowUpRight (open), Info (details),
   CreditCard (plans), KeyRound (credentials), Lock (access), SquarePen, Trash2 (always last).
   The lock shows the action it performs, as in the screenshot (every company there has login
   enabled and shows `Lock`): Lock = "Disable login"; once disabled it shows LockOpen = "Enable
   login" (Phase 0 decision E). Seven inline icons exceed ButtonGhost.md's six — the screenshot
   wins (decision D). */

export type CompanyActionHandlers = {
  onImpersonate: (company: Company) => void
  onDetails: (company: Company) => void
  onUpgrade: (company: Company) => void
  onResetPassword: (company: Company) => void
  onToggleLogin: (company: Company) => void
  onEdit: (company: Company) => void
  onDelete: (company: Company) => void
  /** The company currently being impersonated (its button is busy). */
  impersonatingId?: number | null
}

export function useCompanyActions(handlers: CompanyActionHandlers): (company: Company) => RowAction[] {
  const t = useTranslations('companies.list.actions')
  const { onImpersonate, onDetails, onUpgrade, onResetPassword, onToggleLogin, onEdit, onDelete, impersonatingId } = handlers

  return React.useCallback(
    (company: Company): RowAction[] => {
      const name = company.name
      const enabled = company.is_login_enabled
      return [
        {
          id: 'impersonate',
          label: t('impersonate', { name }),
          tooltip: t('impersonateTip'),
          icon: ArrowUpRight,
          onClick: () => onImpersonate(company),
          disabled: impersonatingId != null,
        },
        { id: 'details', label: t('details', { name }), tooltip: t('detailsTip'), icon: Info, onClick: () => onDetails(company) },
        { id: 'upgrade', label: t('upgrade', { name }), tooltip: t('upgradeTip'), icon: CreditCard, onClick: () => onUpgrade(company) },
        {
          id: 'reset-password',
          label: t('resetPassword', { name }),
          tooltip: t('resetPasswordTip'),
          icon: KeyRound,
          onClick: () => onResetPassword(company),
        },
        {
          id: 'login',
          label: enabled ? t('disableLogin', { name }) : t('enableLogin', { name }),
          tooltip: enabled ? t('disableLoginTip') : t('enableLoginTip'),
          icon: enabled ? Lock : LockOpen,
          onClick: () => onToggleLogin(company),
        },
        { id: 'edit', label: t('edit', { name }), tooltip: t('editTip'), icon: SquarePen, onClick: () => onEdit(company) },
        {
          id: 'delete',
          label: t('delete', { name }),
          tooltip: t('deleteTip'),
          icon: Trash2,
          tone: 'danger',
          onClick: () => onDelete(company),
        },
      ]
    },
    [t, onImpersonate, onDetails, onUpgrade, onResetPassword, onToggleLogin, onEdit, onDelete, impersonatingId],
  )
}
