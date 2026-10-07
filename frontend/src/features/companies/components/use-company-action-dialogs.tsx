'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { toast } from '@/components/ui/toast'
import { useDeleteCompany, useImpersonate, useToggleCompanyLogin } from '@/features/companies/api'
import { ActivityHistoryModal, type HistoryTarget } from '@/features/companies/components/activity-history-modal'
import { useCompanyActions } from '@/features/companies/components/company-actions'
import { CompanyFormModal } from '@/features/companies/components/company-form-modal'
import { ResetPasswordModal } from '@/features/companies/components/reset-password-modal'
import { UpgradePlanModal } from '@/features/companies/components/upgrade-plan-modal'
import type { Company } from '@/features/companies/types'
import { toApiError } from '@/lib/api-error'

/* Everything the company actions open — shared by the list (table + grid) and the details
   page so both run exactly the same flows: impersonation, the Add / Edit Company, Upgrade
   Plan, Reset Password and Activity History modals, and the disable-login and delete
   confirms. Render `dialogs` once; `actionsFor` gives a company's row actions (without
   "details" when no `onDetails` is passed — the details page is already there). */

const noop = () => {}

export function useCompanyActionDialogs({
  onDetails,
  onDeleted,
}: {
  onDetails?: (company: Company) => void
  /** After a successful delete (the details page leaves for the list). */
  onDeleted?: (company: Company) => void
} = {}) {
  const t = useTranslations('companies.list')
  const remove = useDeleteCompany()
  const { mutate: toggleLogin } = useToggleCompanyLogin()
  const impersonate = useImpersonate()

  const [deleting, setDeleting] = React.useState<Company | null>(null)
  const [deleteError, setDeleteError] = React.useState<string | null>(null)
  const [disabling, setDisabling] = React.useState<Company | null>(null)
  const [impersonatingId, setImpersonatingId] = React.useState<number | null>(null)

  // Each modal keeps its record while closing; a new key per opening gives a fresh form.
  const form = useModalState<Company>()
  const upgrade = useModalState<Company>()
  const resetPassword = useModalState<Company>()
  const history = useModalState<HistoryTarget>()
  const { openWith: openForm } = form
  const { openWith: openHistory } = history
  const { openWith: openUpgrade } = upgrade
  const { openWith: openResetPassword } = resetPassword
  const openCreate = React.useCallback(() => openForm(null), [openForm])

  const runToggle = React.useCallback(
    (company: Company) =>
      toggleLogin(company.id, {
        onSuccess: (updated) => toast.success(updated.is_login_enabled ? t('login.enabled') : t('login.disabled')),
        onError: (error) => {
          const apiError = toApiError(error)
          toast.error(t('login.failed'), apiError.fieldErrors.is_login_enabled ?? (apiError.status === 0 ? undefined : apiError.message))
        },
      }),
    [toggleLogin, t],
  )

  // Disabling asks first; enabling happens at once.
  const onToggleLogin = React.useCallback(
    (company: Company) => (company.is_login_enabled ? setDisabling(company) : runToggle(company)),
    [runToggle],
  )

  const allActionsFor = useCompanyActions({
    impersonatingId,
    onImpersonate: React.useCallback(
      (company: Company) => {
        setImpersonatingId(company.id)
        toast.success(t('impersonating', { name: company.name }))
        impersonate.mutate(company.id, {
          // Success leaves the page (full navigation to /dashboard).
          onError: (error) => {
            setImpersonatingId(null)
            toast.error(t('impersonateFailed'), toApiError(error).message)
          },
        })
      },
      [impersonate, t],
    ),
    onDetails: onDetails ?? noop,
    onUpgrade: openUpgrade,
    onResetPassword: openResetPassword,
    onToggleLogin,
    onEdit: openForm,
    onDelete: React.useCallback((company: Company) => {
      setDeleteError(null)
      setDeleting(company)
    }, []),
  })

  const withDetails = onDetails !== undefined
  const actionsFor = React.useCallback(
    (company: Company) => {
      const actions = allActionsFor(company)
      return withDetails ? actions : actions.filter((action) => action.id !== 'details')
    },
    [allActionsFor, withDetails],
  )

  const confirmDelete = () => {
    if (!deleting) return
    const company = deleting
    remove.mutate(company.id, {
      onSuccess: () => {
        setDeleting(null)
        toast.success(t('delete.deleted'))
        onDeleted?.(company)
      },
      onError: (error) => setDeleteError(toApiError(error).message),
    })
  }

  const dialogs = (
    <>
      <CompanyFormModal key={`form-${form.key}`} open={form.open} onOpenChange={form.setOpen} company={form.value} />
      <UpgradePlanModal key={`upgrade-${upgrade.key}`} open={upgrade.open} onOpenChange={upgrade.setOpen} company={upgrade.value} />
      <ResetPasswordModal key={`reset-${resetPassword.key}`} open={resetPassword.open} onOpenChange={resetPassword.setOpen} company={resetPassword.value} />
      <ActivityHistoryModal key={`history-${history.key}`} open={history.open} onOpenChange={history.setOpen} target={history.value} />

      <ConfirmDialog
        open={disabling !== null}
        onOpenChange={(open) => {
          if (!open) setDisabling(null)
        }}
        title={t('login.disableTitle')}
        description={disabling ? t('login.disableBody', { name: disabling.name }) : ''}
        confirmLabel={t('login.disableConfirm')}
        cancelLabel={t('dialog.cancel')}
        closeLabel={t('dialog.close')}
        onConfirm={() => {
          if (disabling) runToggle(disabling)
          setDisabling(null)
        }}
      />

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null)
        }}
        title={t('delete.title')}
        description={deleting ? t('delete.body', { name: deleting.name, email: deleting.email }) : ''}
        confirmLabel={t('delete.confirm')}
        cancelLabel={t('dialog.cancel')}
        closeLabel={t('dialog.close')}
        onConfirm={confirmDelete}
        pending={remove.isPending}
        error={deleteError}
      />
    </>
  )

  return { actionsFor, dialogs, openCreate, openHistory, openUpgrade, onToggleLogin }
}

/** A modal's state: open, the record it is about (kept while closing) and a key per opening. */
function useModalState<T>() {
  const [state, setState] = React.useState<{ key: number; open: boolean; value: T | null }>({ key: 0, open: false, value: null })
  const openWith = React.useCallback((value: T | null) => setState((s) => ({ key: s.key + 1, open: true, value })), [])
  const setOpen = React.useCallback((open: boolean) => setState((s) => ({ ...s, open })), [])
  return { ...state, openWith, setOpen }
}
