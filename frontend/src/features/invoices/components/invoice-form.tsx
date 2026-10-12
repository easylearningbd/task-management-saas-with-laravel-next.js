'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Controller, useForm, useWatch, type FieldPath } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, Calendar, CircleCheck, FileText, Receipt } from 'lucide-react'
import { useFormatter, useTranslations } from 'next-intl'
import { PageHeader } from '@/components/layout/app-shell'
import { DateField, SelectField } from '@/components/shared/form-fields'
import { OrderSummaryCard } from '@/components/shared/order-summary-card'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardHeading } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Field, FieldMessage } from '@/components/ui/field'
import { Label } from '@/components/ui/label'
import { MoneyInput } from '@/components/ui/money-input'
import { MultiSelect } from '@/components/ui/multi-select'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/components/ui/toast'
import { useAuthFormError } from '@/features/auth/components/use-auth-form-error'
import { useClients } from '@/features/clients/api'
import { useProjects } from '@/features/projects/api'
import { useCreateInvoice, useUpdateInvoice } from '@/features/invoices/api'
import { previewInvoice } from '@/features/invoices/calc'
import { InvoiceLineItems } from '@/features/invoices/components/invoice-line-items'
import { createInvoiceSchema, NOTES_MAX, toInvoicePayload, type InvoiceFormValues } from '@/features/invoices/schema'
import type { Invoice, Tax } from '@/features/invoices/types'
import { toApiError } from '@/lib/api-error'
import { useMoney } from '@/lib/format-money'
import { useLeaveGuard } from '@/lib/use-leave-guard'

/* The Create / Edit Invoice form (PAGE SPEC B). Two columns from `xl` — the line rows need the room
   — stacked below:
   - left: "Invoice Details" (Invoice Date* — today by default · Due Date* ≥ it · Client* · Project*
     — the client's projects only, disabled until a client is chosen, cleared when it changes ·
     Tax — the company's active taxes · Discount Amount, default 0), "Invoice Items"
     (InvoiceLineItems), then the footer row: the green check with "{n} items added", Cancel and
     Create Invoice / Update Invoice;
   - right, sticky: "Invoice Summary" — Subtotal, Discount (red, negative), Tax (n%), Total in green
     — and "Notes".
   Below `xl` the footer comes last, after the summary and notes. The summary is calc.ts's preview
   of the server's arithmetic (same rounding, to the cent); what the invoice keeps comes back from
   the server on save. Changing the client or the project clears every line's item / task (they
   belong to the old project). Errors — the server's 422s too, `items.N.project_item_id` /
   `task_id` under the line's Item / Task — show under their field; anything else (an invoice that
   got a payment meanwhile) above the form. Leaving with unsaved changes asks first. A save lands on
   the invoice's details page. */

const SELECT_OPTIONS = { page: 1, per_page: 100, sort: 'name', direction: 'asc' } as const

const TOP_FIELDS = ['client_id', 'project_id', 'invoice_date', 'due_date', 'discount_amount', 'notes'] as const satisfies ReadonlyArray<
  FieldPath<InvoiceFormValues>
>
const LINE_FIELDS: Record<string, 'type' | 'source_id' | 'description' | 'quantity' | 'price'> = {
  type: 'type',
  project_item_id: 'source_id',
  task_id: 'source_id',
  description: 'description',
  quantity: 'quantity',
  price: 'price',
}

/** The form field a server error key belongs to ("items.2.task_id" → "items.2.source_id"). */
function formFieldFor(key: string): FieldPath<InvoiceFormValues> | null {
  if ((TOP_FIELDS as ReadonlyArray<string>).includes(key)) return key as (typeof TOP_FIELDS)[number]
  if (/^tax_ids(\.\d+)?$/.test(key)) return 'tax_ids'
  const line = /^items\.(\d+)\.(\w+)$/.exec(key)
  const name = line ? LINE_FIELDS[line[2]] : undefined
  return line && name ? `items.${Number(line[1])}.${name}` : null
}

export type InvoiceFormMode = { kind: 'create' } | { kind: 'edit'; invoice: Invoice }

export function InvoiceForm({
  mode,
  defaultValues,
  taxes,
  droppedTaxes = [],
}: {
  mode: InvoiceFormMode
  defaultValues: InvoiceFormValues
  /** The company's active taxes — the Tax options and their rates. */
  taxes: ReadonlyArray<Tax>
  /** Edit: taxes on the invoice that are no longer active (they're dropped on save). */
  droppedTaxes?: ReadonlyArray<string>
}) {
  const t = useTranslations('invoices.form')
  const tValidation = useTranslations('invoices.validation')
  const format = useFormatter()
  const money = useMoney()
  const router = useRouter()
  const editing = mode.kind === 'edit'
  const create = useCreateInvoice()
  const update = useUpdateInvoice(editing ? mode.invoice.id : 0)
  const save = editing ? update : create
  const [saved, setSaved] = React.useState(false)
  const taxId = React.useId()
  const discountId = React.useId()
  const notesId = React.useId()

  const schema = React.useMemo(() => createInvoiceSchema(tValidation), [tValidation])
  const [initialValues] = React.useState(defaultValues)
  const form = useForm<InvoiceFormValues>({ resolver: zodResolver(schema), defaultValues: initialValues })
  const {
    register,
    control,
    handleSubmit,
    setError,
    setValue,
    getValues,
    formState: { errors, isDirty, isSubmitted },
  } = form
  const { formError, setFormError, handleError } = useAuthFormError(setError, [])
  const leave = useLeaveGuard(isDirty && !saved)

  const clientId = useWatch({ control, name: 'client_id' })
  const projectId = useWatch({ control, name: 'project_id' })
  const lines = useWatch({ control, name: 'items' })
  const discount = useWatch({ control, name: 'discount_amount' })
  const taxIds = useWatch({ control, name: 'tax_ids' })

  const clients = useClients(SELECT_OPTIONS)
  const projects = useProjects({ ...SELECT_OPTIONS, ...(clientId ? { client_id: Number(clientId) } : {}) }, { enabled: clientId !== '' })
  // The previous client's projects (keepPreviousData) are never offered.
  const projectOptions = clientId === '' || projects.isPlaceholderData ? [] : (projects.data?.data ?? [])

  const rates = taxIds.map((id) => taxes.find((tax) => String(tax.id) === id)?.rate ?? '0')
  const preview = previewInvoice(lines, discount, rates)
  const hasDiscount = preview.discount !== '0.00'

  const updateOptions = { shouldDirty: true, shouldValidate: isSubmitted }
  /** The lines' items / tasks belong to the old project — none of them stays chosen. */
  const clearSources = () => getValues('items').forEach((_, index) => setValue(`items.${index}.source_id`, '', updateOptions))

  const onSaveError = (error: unknown) => {
    const apiError = toApiError(error)
    if (apiError.status === 422) {
      const unmatched: string[] = []
      let applied = false
      for (const [key, message] of Object.entries(apiError.fieldErrors)) {
        const field = formFieldFor(key)
        if (field) {
          setError(field, { type: 'server', message }, { shouldFocus: !applied })
          applied = true
        } else {
          unmatched.push(message)
        }
      }
      if (applied) {
        setFormError(unmatched[0] ?? null)
        return
      }
    }
    handleError(error)
  }

  const onSubmit = (values: InvoiceFormValues) => {
    setFormError(null)
    save.mutate(toInvoicePayload(values), {
      onSuccess: (invoice) => {
        setSaved(true)
        toast.success(t(editing ? 'updated' : 'created', { number: invoice.invoice_number }))
        router.push(`/invoices/${invoice.id}`)
      },
      onError: onSaveError,
    })
  }

  const taxMessage = errors.tax_ids?.message ?? (droppedTaxes.length > 0 ? t('details.taxesDropped', { names: droppedTaxes.join(', '), count: droppedTaxes.length }) : undefined)

  return (
    <>
      <PageHeader
        title={editing ? t('editTitle') : t('createTitle')}
        subtitle={editing ? t('editSubtitle') : t('createSubtitle')}
        action={
          <Button variant="outline" size="sm" onClick={() => leave.request('/invoices')}>
            <ArrowLeft className="size-icon" aria-hidden="true" />
            {t('back')}
          </Button>
        }
      />

      <form noValidate onSubmit={handleSubmit(onSubmit)} className="mt-4 grid grid-cols-1 items-start gap-4 xl:grid-cols-3 xl:grid-rows-[auto_1fr]">
        <div className="flex min-w-0 flex-col gap-4 xl:col-span-2">
          {formError ? <Alert tone="danger">{formError}</Alert> : null}

          <Card>
            <CardHeading divided title={t('details.title')} icon={Calendar} />
            <div className="grid grid-cols-1 gap-x-4 gap-y-4.5 p-card sm:grid-cols-2">
              <DateField label={t('details.invoiceDate')} required error={errors.invoice_date?.message} {...register('invoice_date')} />
              <DateField label={t('details.dueDate')} required error={errors.due_date?.message} {...register('due_date')} />
              <Controller
                control={control}
                name="client_id"
                render={({ field, fieldState }) => (
                  <SelectField
                    label={t('details.client')}
                    required
                    placeholder={t('details.clientPlaceholder')}
                    value={field.value}
                    triggerRef={field.ref}
                    onValueChange={(value) => {
                      if (value === field.value) return
                      field.onChange(value)
                      setValue('project_id', '', updateOptions)
                      clearSources()
                    }}
                    options={(clients.data?.data ?? []).map((client) => ({ value: String(client.id), label: client.name }))}
                    error={fieldState.error?.message}
                  />
                )}
              />
              <Controller
                control={control}
                name="project_id"
                render={({ field, fieldState }) => (
                  <SelectField
                    label={t('details.project')}
                    required
                    placeholder={t('details.projectPlaceholder')}
                    value={field.value}
                    triggerRef={field.ref}
                    disabled={clientId === ''}
                    onValueChange={(value) => {
                      if (value === field.value) return
                      field.onChange(value)
                      clearSources()
                    }}
                    options={projectOptions.map((project) => ({ value: String(project.id), label: project.name }))}
                    error={fieldState.error?.message}
                    hint={
                      clientId === ''
                        ? t('details.projectHint')
                        : projects.isSuccess && !projects.isPlaceholderData && projectOptions.length === 0
                          ? t('details.noProjects')
                          : undefined
                    }
                  />
                )}
              />
              <Field>
                <Label htmlFor={taxId}>{t('details.tax')}</Label>
                <Controller
                  control={control}
                  name="tax_ids"
                  render={({ field, fieldState }) => (
                    <MultiSelect
                      id={taxId}
                      value={field.value}
                      onValueChange={field.onChange}
                      options={taxes.map((tax) => ({ value: String(tax.id), label: tax.label }))}
                      placeholder={t('details.taxPlaceholder')}
                      label={t('details.tax')}
                      emptyLabel={t('details.noTaxes')}
                      invalid={fieldState.error !== undefined}
                      describedBy={taxMessage ? `${taxId}-message` : undefined}
                    />
                  )}
                />
                {taxMessage ? (
                  <FieldMessage id={`${taxId}-message`} error={errors.tax_ids !== undefined}>
                    {taxMessage}
                  </FieldMessage>
                ) : null}
              </Field>
              <Field>
                <Label htmlFor={discountId}>{t('details.discount')}</Label>
                <MoneyInput
                  id={discountId}
                  aria-invalid={errors.discount_amount ? true : undefined}
                  aria-describedby={errors.discount_amount ? `${discountId}-message` : undefined}
                  {...register('discount_amount')}
                />
                {errors.discount_amount?.message ? (
                  <FieldMessage id={`${discountId}-message`} error>
                    {errors.discount_amount.message}
                  </FieldMessage>
                ) : null}
              </Field>
            </div>
          </Card>

          <InvoiceLineItems form={form} projectId={projectId ? Number(projectId) : null} lineTotals={preview.lines} />
        </div>

        <div className="flex min-w-0 flex-col gap-4 xl:sticky xl:top-[calc(var(--spacing-topbar)+1rem)] xl:col-start-3 xl:row-span-2 xl:row-start-1">
          <OrderSummaryCard
            title={t('summary.title')}
            icon={Receipt}
            rows={[
              { id: 'subtotal', label: t('summary.subtotal'), value: <span className="font-mono text-money">{money(preview.subtotal)}</span> },
              {
                id: 'discount',
                label: t('summary.discount'),
                tone: 'danger',
                value: <span className="font-mono text-money">{money(hasDiscount ? `-${preview.discount}` : '0')}</span>,
              },
              {
                id: 'tax',
                label: t('summary.tax', { rate: format.number(Number(preview.taxRate), { maximumFractionDigits: 2 }) }),
                value: <span className="font-mono text-money">{money(preview.taxAmount)}</span>,
              },
            ]}
            total={{ label: t('summary.total'), value: <span className="font-mono">{money(preview.total)}</span>, className: 'text-primary-strong' }}
          />

          <Card>
            <CardHeading divided title={t('notes.title')} icon={FileText} />
            <div className="p-card">
              <Field>
                <Label htmlFor={notesId} className="sr-only">
                  {t('notes.label')}
                </Label>
                <Textarea
                  id={notesId}
                  rows={4}
                  placeholder={t('notes.placeholder')}
                  maxLength={NOTES_MAX}
                  aria-invalid={errors.notes ? true : undefined}
                  aria-describedby={errors.notes ? `${notesId}-message` : undefined}
                  {...register('notes')}
                />
                {errors.notes?.message ? (
                  <FieldMessage id={`${notesId}-message`} error>
                    {errors.notes.message}
                  </FieldMessage>
                ) : null}
              </Field>
            </div>
          </Card>
        </div>

        <Card className="flex flex-wrap items-center justify-between gap-3 p-card xl:col-span-2 xl:row-start-2">
          <p className="inline-flex items-center gap-2 text-body text-muted-foreground" aria-live="polite">
            <CircleCheck className="size-icon text-success" aria-hidden="true" />
            {t('footer.count', { count: lines.length })}
          </p>
          <div className="flex flex-wrap gap-3">
            <Button type="button" variant="outline" onClick={() => leave.request('/invoices')}>
              {t('footer.cancel')}
            </Button>
            <Button type="submit" loading={save.isPending} disabled={save.isPending || saved}>
              {editing ? t('footer.update') : t('footer.create')}
            </Button>
          </div>
        </Card>
      </form>

      <ConfirmDialog
        open={leave.pendingHref !== null}
        onOpenChange={(open) => {
          if (!open) leave.cancel()
        }}
        title={t('leave.title')}
        description={t('leave.body')}
        confirmLabel={t('leave.confirm')}
        cancelLabel={t('leave.cancel')}
        closeLabel={t('leave.close')}
        onConfirm={leave.confirm}
      />
    </>
  )
}
