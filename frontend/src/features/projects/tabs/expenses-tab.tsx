'use client'

import * as React from 'react'
import { Calendar, ChartColumn, DollarSign, SquarePen, Trash2, type LucideIcon } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { RowActions } from '@/components/shared/row-actions'
import { Card } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { TintBadge } from '@/components/ui/tint-badge'
import { toast } from '@/components/ui/toast'
import { toApiError } from '@/lib/api-error'
import { cn } from '@/lib/cn'
import { useMoney } from '@/lib/format-money'
import { useExpenses, useExpenseStats, useExpenseWrites } from '@/features/projects/api'
import { ExpenseFormModal } from '@/features/projects/components/expense-form-modal'
import { TabCard, TileGridSkeleton } from '@/features/projects/components/tab-card'
import type { Expense } from '@/features/projects/types'
import type { ProjectTabProps } from '@/features/projects/tabs/registry'

/* The Expenses tab (PAGE SPEC C and the Expenses screenshot):
   - two stat cards above the list: Total Expenses — the count, "expense records" (DollarSign
     in a `danger-soft` tile: the screenshot's red) · Total Amount — the exact total, "total
     spent" (ChartColumn in the amber stat tile); from GET …/expenses/stats.
   - a card titled "Expenses" with a green "+ Add Expense"; a two-column grid (one on phones) of
     expense tiles that scrolls vertically past ~4 rows: title (`title-row`), description
     (muted), the category badge tinted with the category's own colour (TintBadge), a Calendar
     glyph with the date, the amount in `danger`, bold, `money` font-mono, right-aligned, and
     edit + delete icons. Newest date first.
   Every change refreshes both stat cards, the tab count, the Expenses summary card and the
   Overview's Budget Analysis donut together (the project's cache). */

type FormState = { key: number; open: boolean; expense: Expense | null }

export function ExpensesTab({ project }: ProjectTabProps) {
  const t = useTranslations('projects.expenses')
  const money = useMoney()
  const expenses = useExpenses(project.id)
  const stats = useExpenseStats(project.id)
  const { remove } = useExpenseWrites(project.id)
  const [form, setForm] = React.useState<FormState>({ key: 0, open: false, expense: null })
  const [deleting, setDeleting] = React.useState<Expense | null>(null)
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

  const list = expenses.data ?? []

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <MiniStat
          icon={DollarSign}
          tile="bg-danger-soft text-danger"
          label={t('stats.count')}
          value={stats.data ? String(stats.data.count) : null}
          caption={t('stats.countCaption')}
        />
        <MiniStat
          icon={ChartColumn}
          tile="bg-stat-amber-icon-bg text-stat-amber-icon"
          label={t('stats.total')}
          value={stats.data ? money(stats.data.total) : null}
          caption={t('stats.totalCaption')}
        />
      </div>

      <TabCard
        title={t('title')}
        addLabel={t('add')}
        onAdd={() => setForm((f) => ({ key: f.key + 1, open: true, expense: null }))}
        query={expenses}
        isEmpty={list.length === 0}
        empty={{ icon: DollarSign, title: t('empty.title'), description: t('empty.description') }}
        skeleton={<TileGridSkeleton />}
      >
        <ul aria-label={t('title')} tabIndex={0} className="grid max-h-128 grid-cols-1 gap-4 overflow-y-auto p-card focus-visible:shadow-focus focus-visible:outline-none md:grid-cols-2">
          {list.map((expense) => (
            <li key={expense.id}>
              <ExpenseTile
                expense={expense}
                onEdit={() => setForm((f) => ({ key: f.key + 1, open: true, expense }))}
                onDelete={() => {
                  setDeleteError(null)
                  setDeleting(expense)
                }}
              />
            </li>
          ))}
        </ul>
      </TabCard>

      <ExpenseFormModal
        key={form.key}
        open={form.open}
        onOpenChange={(open) => setForm((f) => ({ ...f, open }))}
        projectId={project.id}
        expense={form.expense}
      />

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null)
        }}
        title={t('delete.title')}
        description={deleting ? t('delete.body', { title: deleting.title, amount: money(deleting.amount) }) : ''}
        confirmLabel={t('delete.confirm')}
        cancelLabel={t('delete.cancel')}
        closeLabel={t('delete.close')}
        onConfirm={confirmDelete}
        pending={remove.isPending}
        error={deleteError}
      />
    </div>
  )
}

/* A summary card of this tab — Card.md's surface at the stat cards' 20px padding: the `body`
   muted label over the 24px/700 figure and a `caption` note, with StatCard's 40px
   `radius-tile` icon tile on the right. */
function MiniStat({ icon: Icon, tile, label, value, caption }: { icon: LucideIcon; tile: string; label: string; value: string | null; caption: string }) {
  return (
    <Card className="flex items-center justify-between gap-4 p-5">
      <div className="min-w-0">
        <p className="text-body text-muted-foreground">{label}</p>
        {value === null ? (
          <Skeleton className="mt-1.5 h-7 w-24" />
        ) : (
          <p className="mt-1 truncate text-2xl leading-8 font-bold tracking-[-0.01em]" title={value}>
            {value}
          </p>
        )}
        <p className="mt-0.5 text-caption text-muted-foreground">{caption}</p>
      </div>
      <span className={cn('inline-flex size-tile shrink-0 items-center justify-center rounded-tile', tile)}>
        <Icon className="size-icon-lg" strokeWidth={1.75} aria-hidden="true" />
      </span>
    </Card>
  )
}

function ExpenseTile({ expense, onEdit, onDelete }: { expense: Expense; onEdit: () => void; onDelete: () => void }) {
  const t = useTranslations('projects.expenses')
  const money = useMoney()

  return (
    <article className="flex h-full flex-col rounded-lg border border-border p-4">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-title-row break-words">{expense.title}</h3>
          {expense.description ? <p className="mt-1 text-body-sm text-muted-foreground break-words">{expense.description}</p> : null}
        </div>
        <RowActions
          className="-mt-1 -mr-1 shrink-0"
          actions={[
            { id: 'edit', label: t('actions.edit', { title: expense.title }), tooltip: t('actions.editTip'), icon: SquarePen, onClick: onEdit },
            { id: 'delete', label: t('actions.delete', { title: expense.title }), tooltip: t('actions.deleteTip'), icon: Trash2, tone: 'danger', onClick: onDelete },
          ]}
        />
      </div>
      <div className="mt-auto flex flex-wrap items-end justify-between gap-x-3 gap-y-2 pt-3">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5">
          {expense.category ? <TintBadge color={expense.category.color}>{expense.category.name}</TintBadge> : null}
          <span className="inline-flex items-center gap-1.5 text-body-sm text-muted-foreground-alt tabular-nums">
            <Calendar className="size-3.5 shrink-0" aria-hidden="true" />
            {expense.expense_date}
          </span>
        </div>
        <span className="font-mono text-money font-bold text-danger">{money(expense.amount)}</span>
      </div>
    </article>
  )
}
