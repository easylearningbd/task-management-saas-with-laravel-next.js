'use client'

import * as React from 'react'
import { Controller, useFieldArray, useWatch, type UseFormReturn } from 'react-hook-form'
import { Box, Plus } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { LineItemHeader, LineItemRow } from '@/components/shared/line-item-row'
import { Button } from '@/components/ui/button'
import { Card, CardHeading } from '@/components/ui/card'
import { Field, FieldMessage } from '@/components/ui/field'
import { Label } from '@/components/ui/label'
import { MoneyInput } from '@/components/ui/money-input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useProjectItems } from '@/features/projects/api'
import { useTasks } from '@/features/tasks/api'
import { DESCRIPTION_MAX, emptyLine, type InvoiceFormValues } from '@/features/invoices/schema'
import { INVOICE_ITEM_TYPES, type InvoiceItemType } from '@/features/invoices/types'
import { useMoney } from '@/lib/format-money'

/* The "Invoice Items" card (PAGE SPEC B): the header row `Type | Item / Task * | Qty | Price |
   Total | Action`, then one LineItemRow per line —
   - Type: Item (default) / Task; switching clears the chosen item / task;
   - Item / Task*: the chosen project's items, or its tasks (A–Z, up to 100) — disabled, with the
     hint above the rows, until a project is chosen. Choosing an item fills Price with its default
     price and the description with its description (its name when it has none — what the server
     falls back to); choosing a task fills the description with its title. Both stay editable;
   - Qty (default 1, > 0) and Price (default 0, ≥ 0): MoneyInput, 2 places at most;
   - Total: the live preview of qty × price (calc.ts — the server's rounding);
   - the chevron shows / hides the description textarea under the row (open by default, and
     always open while it holds an error); the trash removes the line — disabled on the last one.
   Then the dashed full-width "+ Add another item". Below `md` each cell carries its own label;
   from `md` the labels are for screen readers and the header row shows them. */

const GRID =
  'md:grid-cols-[minmax(0,1.1fr)_minmax(0,2fr)_minmax(0,0.9fr)_minmax(0,1fr)_minmax(0,1fr)_calc(2*var(--spacing-control-sm)+var(--spacing)*1.5)]'

const TASK_OPTIONS = { page: 1, per_page: 100, sort: 'title', direction: 'asc' } as const

type Source = { id: number; label: string; price?: string; description: string }

export function InvoiceLineItems({
  form,
  projectId,
  lineTotals,
}: {
  form: UseFormReturn<InvoiceFormValues>
  /** The chosen project, or null — the item / task selects wait for it. */
  projectId: number | null
  /** The preview's line totals, in the rows' order. */
  lineTotals: ReadonlyArray<string>
}) {
  const t = useTranslations('invoices.form.items')
  const tCommon = useTranslations('common')
  const money = useMoney()
  const hintId = React.useId()
  const {
    control,
    register,
    setValue,
    formState: { errors, isSubmitted },
  } = form
  const { fields, append, remove } = useFieldArray({ control, name: 'items' })
  const lines = useWatch({ control, name: 'items' })
  const [collapsed, setCollapsed] = React.useState<ReadonlySet<string>>(() => new Set())

  const projectItems = useProjectItems(projectId)
  const tasks = useTasks({ ...TASK_OPTIONS, ...(projectId !== null ? { project_id: projectId } : {}) }, { enabled: projectId !== null })

  // Another project's tasks (the previous page of a keepPreviousData query) are never offered.
  const sources = React.useMemo<Record<InvoiceItemType, Source[]>>(
    () => ({
      item:
        projectId === null
          ? []
          : (projectItems.data ?? []).map((item) => ({
              id: item.id,
              label: item.name,
              price: item.default_price,
              description: item.description?.trim() || item.name,
            })),
      task:
        projectId === null || tasks.isPlaceholderData
          ? []
          : (tasks.data?.data ?? []).map((task) => ({ id: task.id, label: task.title, description: task.title })),
    }),
    [projectId, projectItems.data, tasks.data, tasks.isPlaceholderData],
  )
  const loading: Record<InvoiceItemType, boolean> = {
    item: projectId !== null && projectItems.isPending,
    task: projectId !== null && (tasks.isPending || tasks.isPlaceholderData),
  }

  const update = { shouldDirty: true, shouldValidate: isSubmitted }
  const choose = (index: number, type: InvoiceItemType, value: string) => {
    const source = sources[type].find((option) => String(option.id) === value)
    if (!source) return
    if (source.price !== undefined) setValue(`items.${index}.price`, source.price, update)
    setValue(`items.${index}.description`, source.description, update)
  }
  const toggle = (id: string) =>
    setCollapsed((previous) => {
      const next = new Set(previous)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const listError = errors.items?.root?.message ?? errors.items?.message

  return (
    <Card>
      <CardHeading divided title={t('title')} icon={Box} />
      <div className="flex flex-col gap-3 p-card">
        {projectId === null ? (
          <p id={hintId} className="text-body-sm text-muted-foreground">
            {t('projectFirst')}
          </p>
        ) : null}

        <LineItemHeader
          gridClassName={GRID}
          labels={[
            t('type'),
            <>
              {t('source')}
              <span aria-hidden="true" className="ml-0.5 text-destructive">
                *
              </span>
            </>,
            t('qty'),
            t('price'),
            t('total'),
            t('action'),
          ]}
        />

        {fields.map((field, index) => {
          const line = lines[index] ?? field
          const type = line.type
          const rowErrors = errors.items?.[index]
          const lineNo = index + 1
          const id = (name: string) => `${field.id}-${name}`
          const messageId = (name: string) => `${field.id}-${name}-message`
          const descriptionError = rowErrors?.description?.message
          const expanded = !collapsed.has(field.id) || descriptionError !== undefined
          const sourceError = rowErrors?.source_id?.message
          const options = sources[type]

          return (
            <LineItemRow
              key={field.id}
              gridClassName={GRID}
              cells={[
                <Field key="type">
                  <Label htmlFor={id('type')} className="md:sr-only">
                    {t('type')}
                  </Label>
                  <Controller
                    control={control}
                    name={`items.${index}.type`}
                    render={({ field: typeField }) => (
                      <Select
                        value={typeField.value}
                        onValueChange={(value) => {
                          if (value === typeField.value) return
                          typeField.onChange(value)
                          setValue(`items.${index}.source_id`, '', update)
                        }}
                      >
                        <SelectTrigger id={id('type')} ref={typeField.ref}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {INVOICE_ITEM_TYPES.map((value) => (
                            <SelectItem key={value} value={value}>
                              {t(`types.${value}`)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </Field>,

                <Field key="source">
                  <Label htmlFor={id('source')} required requiredLabel={tCommon('requiredField')} className="md:sr-only">
                    {t('source')}
                  </Label>
                  <Controller
                    control={control}
                    name={`items.${index}.source_id`}
                    render={({ field: sourceField }) => (
                      <Select
                        value={sourceField.value}
                        onValueChange={(value) => {
                          sourceField.onChange(value)
                          choose(index, type, value)
                        }}
                        disabled={projectId === null}
                      >
                        <SelectTrigger
                          id={id('source')}
                          ref={sourceField.ref}
                          aria-invalid={sourceError ? true : undefined}
                          aria-required
                          aria-describedby={sourceError ? messageId('source') : projectId === null ? hintId : undefined}
                        >
                          <SelectValue placeholder={type === 'item' ? t('chooseItem') : t('chooseTask')} />
                        </SelectTrigger>
                        <SelectContent>
                          {options.length === 0 ? (
                            <p className="px-2 py-1.5 text-body-sm text-muted-foreground">
                              {loading[type] ? tCommon('loading') : type === 'item' ? t('noItems') : t('noTasks')}
                            </p>
                          ) : (
                            options.map((option) => (
                              <SelectItem key={option.id} value={String(option.id)}>
                                {option.label}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {sourceError ? (
                    <FieldMessage id={messageId('source')} error>
                      {sourceError}
                    </FieldMessage>
                  ) : null}
                </Field>,

                <Field key="quantity">
                  <Label htmlFor={id('quantity')} required requiredLabel={tCommon('requiredField')} className="md:sr-only">
                    {t('qty')}
                  </Label>
                  <MoneyInput
                    id={id('quantity')}
                    aria-invalid={rowErrors?.quantity ? true : undefined}
                    aria-describedby={rowErrors?.quantity ? messageId('quantity') : undefined}
                    aria-required
                    {...register(`items.${index}.quantity`)}
                  />
                  {rowErrors?.quantity?.message ? (
                    <FieldMessage id={messageId('quantity')} error>
                      {rowErrors.quantity.message}
                    </FieldMessage>
                  ) : null}
                </Field>,

                <Field key="price">
                  <Label htmlFor={id('price')} required requiredLabel={tCommon('requiredField')} className="md:sr-only">
                    {t('price')}
                  </Label>
                  <MoneyInput
                    id={id('price')}
                    aria-invalid={rowErrors?.price ? true : undefined}
                    aria-describedby={rowErrors?.price ? messageId('price') : undefined}
                    aria-required
                    {...register(`items.${index}.price`)}
                  />
                  {rowErrors?.price?.message ? (
                    <FieldMessage id={messageId('price')} error>
                      {rowErrors.price.message}
                    </FieldMessage>
                  ) : null}
                </Field>,

                <Field key="total">
                  <span className="text-label text-foreground md:sr-only">{t('total')}</span>
                  <p className="flex h-control items-center font-mono text-money font-semibold">{money(lineTotals[index] ?? '0')}</p>
                </Field>,
              ]}
              detail={
                <Field>
                  <Textarea
                    aria-label={t('description', { line: lineNo })}
                    placeholder={t('descriptionPlaceholder')}
                    rows={2}
                    maxLength={DESCRIPTION_MAX}
                    aria-invalid={descriptionError ? true : undefined}
                    aria-describedby={descriptionError ? messageId('description') : undefined}
                    {...register(`items.${index}.description`)}
                  />
                  {descriptionError ? (
                    <FieldMessage id={messageId('description')} error>
                      {descriptionError}
                    </FieldMessage>
                  ) : null}
                </Field>
              }
              expanded={expanded}
              onToggle={() => toggle(field.id)}
              onRemove={() => remove(index)}
              removeDisabledReason={fields.length === 1 ? t('lastLine') : undefined}
              toggleLabel={t(expanded ? 'hideDescription' : 'showDescription', { line: lineNo })}
              removeLabel={t('remove', { line: lineNo })}
            />
          )
        })}

        {listError ? <FieldMessage error>{listError}</FieldMessage> : null}

        <Button type="button" variant="outline" className="w-full border-dashed" onClick={() => append(emptyLine(), { focusName: `items.${fields.length}.type` })}>
          <Plus className="size-icon" aria-hidden="true" />
          {t('add')}
        </Button>
      </div>
    </Card>
  )
}
