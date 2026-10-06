'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Controller, useForm, useWatch, type Control, type UseFormRegisterReturn } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslations } from 'next-intl'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Field, FieldMessage } from '@/components/ui/field'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/components/ui/toast'
import { TextField } from '@/features/auth/components/text-field'
import { useAuthFormError } from '@/features/auth/components/use-auth-form-error'
import { useCreatePlan, usePlan, useUpdatePlan } from '@/features/plans/api'
import {
  createPlanSchema,
  EMPTY_PLAN_FORM,
  formValuesToPayload,
  planToFormValues,
  type PlanFormValues,
} from '@/features/plans/schema'
import type { Plan } from '@/features/plans/types'
import { cn } from '@/lib/cn'

const FIELDS = [
  'name',
  'description',
  'monthly_price',
  'yearly_price',
  'max_projects',
  'storage_limit_gb',
  'trial_days',
  'trial_enabled',
  'ai_integration',
  'is_active',
  'is_default',
] as const

type SwitchName = 'ai_integration' | 'trial_enabled' | 'is_active' | 'is_default'

/* The Create / Edit Plan form from the Create Plan screenshot: one card holding a two-column
   grid (Plan Name | Maximum Projects · Monthly Price | Storage Limit · Yearly Price | Trial
   Days · Description), then the "Features" and "Settings" panels, then Cancel + the submit
   button right-aligned. Single column on phones. */
export function PlanForm({ plan }: { plan?: Plan }) {
  const t = useTranslations('plans.form')
  const tValidation = useTranslations('plans.validation')
  const tCommon = useTranslations('common')
  const router = useRouter()
  const isEdit = plan !== undefined
  // Edit: keep the server-loaded plan as the cache's starting point (fresh after saves).
  const current = usePlan(plan?.id ?? 0, { initialData: plan }).data ?? plan
  const create = useCreatePlan()
  const update = useUpdatePlan(plan?.id ?? 0)
  const mutation = isEdit ? update : create

  const schema = React.useMemo(() => createPlanSchema(tValidation), [tValidation])
  const {
    register,
    control,
    handleSubmit,
    setError,
    setValue,
    clearErrors,
    formState: { errors },
  } = useForm<PlanFormValues>({
    resolver: zodResolver(schema),
    defaultValues: current ? planToFormValues(current) : EMPTY_PLAN_FORM,
  })
  const { formError, setFormError, handleError } = useAuthFormError(setError, FIELDS)

  const trialEnabled = useWatch({ control, name: 'trial_enabled' })
  const isDefault = useWatch({ control, name: 'is_default' })
  /** The current default plan can't be un-defaulted here — another plan has to take over. */
  const lockedDefault = isEdit && current?.is_default === true

  const onSubmit = (values: PlanFormValues) => {
    setFormError(null)
    mutation.mutate(formValuesToPayload(values), {
      onSuccess: () => {
        toast.success(isEdit ? t('updated') : t('created'))
        router.push('/admin/plans')
      },
      onError: handleError,
    })
  }

  const busy = mutation.isPending || mutation.isSuccess

  return (
    <form noValidate onSubmit={handleSubmit(onSubmit)} className="rounded-xl border border-border bg-card p-6 shadow-xs">
      {formError ? (
        <Alert tone="danger" className="mb-5">
          {formError}
        </Alert>
      ) : null}

      <div className="grid grid-cols-1 gap-x-6 gap-y-3.5 md:grid-cols-2">
        <TextField
          label={t('name')}
          placeholder={t('namePlaceholder')}
          required
          error={errors.name?.message}
          {...register('name')}
        />
        <TextField
          label={t('maxProjects')}
          type="number"
          inputMode="numeric"
          step={1}
          required
          error={errors.max_projects?.message}
          {...register('max_projects')}
        />
        <TextField
          label={t('monthlyPrice')}
          type="number"
          inputMode="decimal"
          step="0.01"
          min={0}
          required
          error={errors.monthly_price?.message}
          {...register('monthly_price')}
        />
        <TextField
          label={t('storage')}
          type="number"
          inputMode="decimal"
          step="0.01"
          min={0}
          required
          error={errors.storage_limit_gb?.message}
          {...register('storage_limit_gb')}
        />
        <TextField
          label={
            <>
              {t('yearlyPrice')} <span className="font-normal text-muted-foreground">{t('optional')}</span>
            </>
          }
          type="number"
          inputMode="decimal"
          step="0.01"
          min={0}
          placeholder={t('yearlyPlaceholder')}
          hint={t('yearlyHint')}
          error={errors.yearly_price?.message}
          {...register('yearly_price')}
        />
        <TextField
          label={t('trialDays')}
          type="number"
          inputMode="numeric"
          step={1}
          min={0}
          disabled={!trialEnabled}
          error={errors.trial_days?.message}
          {...register('trial_days')}
        />
        <DescriptionField
          label={t('description')}
          placeholder={t('descriptionPlaceholder')}
          error={errors.description?.message}
          registration={register('description')}
        />
      </div>

      <Panel title={t('features')} className="mt-6">
        <SwitchRow
          control={control}
          name="ai_integration"
          label={t('aiIntegration')}
          error={errors.ai_integration?.message}
        />
        <SwitchRow
          control={control}
          name="trial_enabled"
          label={t('enableTrial')}
          error={errors.trial_enabled?.message}
          onToggle={(on) => {
            // Off: Trial Days is zeroed and disabled (the server stores 0 anyway).
            if (!on) {
              setValue('trial_days', '0')
              clearErrors('trial_days')
            }
          }}
        />
      </Panel>

      <Panel title={t('settings')} className="mt-6">
        <SwitchRow
          control={control}
          name="is_active"
          label={t('active')}
          disabled={isDefault} // a default plan is always active
          error={errors.is_active?.message}
        />
        <SwitchRow
          control={control}
          name="is_default"
          label={t('defaultPlan')}
          disabled={lockedDefault}
          hint={lockedDefault ? t('currentDefault') : t('defaultWarning')}
          hintTone={lockedDefault ? 'muted' : 'warning'}
          error={errors.is_default?.message}
          onToggle={(on) => {
            if (on) setValue('is_active', true)
          }}
        />
      </Panel>

      <div className="mt-6 flex flex-wrap justify-end gap-3">
        <Button asChild variant="outline">
          <Link href="/admin/plans">{t('cancel')}</Link>
        </Button>
        <Button type="submit" loading={busy} disabled={busy}>
          {isEdit ? t('update') : t('create')}
        </Button>
      </div>

      <span className="sr-only" aria-live="polite">
        {busy ? tCommon('loading') : ''}
      </span>
    </form>
  )
}

/** "Features" / "Settings": a bordered panel (no shadow) with a `title-card` heading and two
 *  switch rows side by side — each label on the left of its half, the switch on the right. */
function Panel({ title, className, children }: { title: string; className?: string; children: React.ReactNode }) {
  const headingId = React.useId()
  return (
    <section aria-labelledby={headingId} className={cn('rounded-xl border border-border p-4', className)}>
      <h2 id={headingId} className="text-title-card">
        {title}
      </h2>
      <div className="mt-4 grid grid-cols-1 gap-x-4 gap-y-4 md:grid-cols-2">{children}</div>
    </section>
  )
}

function SwitchRow({
  control,
  name,
  label,
  hint,
  hintTone = 'muted',
  error,
  disabled = false,
  onToggle,
}: {
  control: Control<PlanFormValues>
  name: SwitchName
  label: string
  hint?: string
  hintTone?: 'muted' | 'warning'
  error?: string
  disabled?: boolean
  onToggle?: (on: boolean) => void
}) {
  const id = React.useId()
  const messageId = `${id}-message`
  const message = error ?? hint

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <Label htmlFor={id}>{label}</Label>
        {message ? (
          <p
            id={messageId}
            role={error ? 'alert' : undefined}
            className={cn('mt-0.5 text-caption font-normal', error ? 'text-danger' : hintTone === 'warning' ? 'text-warning' : 'text-muted-foreground')}
          >
            {message}
          </p>
        ) : null}
      </div>
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <Switch
            id={id}
            name={field.name}
            checked={field.value}
            onCheckedChange={(on) => {
              field.onChange(on)
              onToggle?.(on)
            }}
            onBlur={field.onBlur}
            ref={field.ref}
            disabled={disabled}
            aria-describedby={message ? messageId : undefined}
            aria-invalid={error ? true : undefined}
          />
        )}
      />
    </div>
  )
}

function DescriptionField({
  label,
  placeholder,
  error,
  registration,
}: {
  label: string
  placeholder: string
  error?: string
  registration: UseFormRegisterReturn<'description'>
}) {
  const id = React.useId()
  const messageId = `${id}-message`
  return (
    <Field>
      <Label htmlFor={id}>{label}</Label>
      {/* ~80px tall as in the screenshot (Textarea.md's default is 92px). */}
      <Textarea
        id={id}
        placeholder={placeholder}
        className="min-h-20"
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? messageId : undefined}
        {...registration}
      />
      {error ? (
        <FieldMessage id={messageId} error>
          {error}
        </FieldMessage>
      ) : null}
    </Field>
  )
}
