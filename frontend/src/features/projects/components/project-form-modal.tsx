'use client'

import * as React from 'react'
import Link from 'next/link'
import { Controller, useForm, useWatch, type FieldPath } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslations } from 'next-intl'
import { DateField, SelectField, TextareaField } from '@/components/shared/form-fields'
import { FormModal } from '@/components/shared/form-modal'
import { Button } from '@/components/ui/button'
import { ComingSoon } from '@/components/ui/coming-soon'
import { toast } from '@/components/ui/toast'
import { TextField } from '@/features/auth/components/text-field'
import { useAuthFormError } from '@/features/auth/components/use-auth-form-error'
import { useClients } from '@/features/clients/api'
import { useCreateProject, useUpdateProject } from '@/features/projects/api'
import {
  createProjectSchema,
  EMPTY_PROJECT_FORM,
  projectToFormValues,
  toProjectPayload,
  type ProjectFormValues,
} from '@/features/projects/schema'
import { PROJECT_PRIORITIES, PROJECT_STATUSES, type Project } from '@/features/projects/types'
import { isPlanLimitError, toApiError } from '@/lib/api-error'

/* Add New Project / Edit Project — PAGE SPEC B: the 468px modal with a rule under the header,
   one column, in this order:
     Project Name* · Description · Client* · Start Date* · End Date* · Budget* · Priority · Status
   Footer: Cancel (outline) · Save (green). Priority defaults to Medium, Status to Active.
   - Client lists this company's ACTIVE clients, A–Z (the server checks again). Editing keeps the
     project's own client selectable even if it was deactivated since (the server allows it).
     With no active clients the select is disabled and points at /clients.
   - End Date can't be before Start Date (its picker starts there too).
   - zod mirrors the server; a 422 lands under its field, anything else in the alert above the
     fields. The plan's project limit (422 `plan_limit_reached`, create only — editing is never
     blocked) shows the server's message with an Upgrade button. Upgrade stays "Coming soon"
     until the company Plans page exists, like the sidebar's.
   FormModal owns focus (first field on open, back to the trigger on close) and the
   unsaved-changes confirm. */

const FIELDS = [
  'name',
  'description',
  'client_id',
  'start_date',
  'end_date',
  'budget',
  'priority',
  'status',
] as const satisfies ReadonlyArray<FieldPath<ProjectFormValues>>

export function ProjectFormModal({
  open,
  onOpenChange,
  project,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Edit this project; null to create. */
  project: Project | null
}) {
  const t = useTranslations('projects.form')
  const tValidation = useTranslations('projects.validation')
  const tPriority = useTranslations('projects.priority')
  const tStatus = useTranslations('projects.status')
  const isEdit = project !== null
  const create = useCreateProject()
  const update = useUpdateProject(project?.id ?? 0)
  const mutation = isEdit ? update : create

  const clients = useClients({ page: 1, per_page: 100, status: 'active', sort: 'name', direction: 'asc' })
  const clientOptions = React.useMemo(() => {
    const options = (clients.data?.data ?? []).map((client) => ({ value: String(client.id), label: client.name }))
    // Edit: the project's own client stays selectable even if it was deactivated since.
    if (project?.client && !options.some((option) => option.value === String(project.client_id))) {
      options.unshift({ value: String(project.client_id), label: project.client.name })
    }
    return options
  }, [clients.data, project])
  const noClients = clients.isSuccess && clientOptions.length === 0

  const schema = React.useMemo(() => createProjectSchema(tValidation), [tValidation])
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isDirty },
  } = useForm<ProjectFormValues>({
    resolver: zodResolver(schema),
    defaultValues: project ? projectToFormValues(project) : EMPTY_PROJECT_FORM,
  })
  const startDate = useWatch({ control, name: 'start_date' })
  const { formError, setFormError, handleError } = useAuthFormError(setError, FIELDS)
  const [limitMessage, setLimitMessage] = React.useState<string | null>(null)

  const onSubmit = (values: ProjectFormValues) => {
    setFormError(null)
    setLimitMessage(null)
    const done = {
      onSuccess: () => {
        toast.success(isEdit ? t('updated') : t('created'))
        onOpenChange(false) // straight to the parent: a saved form has nothing to discard
      },
      onError: (error: unknown) => {
        const apiError = toApiError(error)
        if (isPlanLimitError(apiError)) setLimitMessage(apiError.message)
        else handleError(error)
      },
    }
    if (isEdit) update.mutate(toProjectPayload(values), done)
    else create.mutate(toProjectPayload(values), done)
  }

  const alert = limitMessage ? (
    <span className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <span className="min-w-0 flex-1 basis-48">{limitMessage}</span>
      <ComingSoon>
        <Button type="button" variant="outline" size="sm">
          {t('upgrade')}
        </Button>
      </ComingSoon>
    </span>
  ) : (
    formError
  )

  return (
    <FormModal
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? t('editTitle') : t('createTitle')}
      onSubmit={handleSubmit(onSubmit)}
      submitLabel={t('save')}
      cancelLabel={t('cancel')}
      pending={mutation.isPending}
      dirty={isDirty}
      error={alert}
      size="sm"
      divided
    >
      <div className="flex flex-col gap-4.5">
        <TextField
          label={t('name')}
          placeholder={t('namePlaceholder')}
          required
          autoComplete="off"
          error={errors.name?.message}
          {...register('name')}
        />
        <TextareaField
          label={t('description')}
          placeholder={t('descriptionPlaceholder')}
          error={errors.description?.message}
          {...register('description')}
        />
        <div>
          <Controller
            control={control}
            name="client_id"
            render={({ field, fieldState }) => (
              <SelectField
                label={t('client')}
                required
                value={field.value}
                onValueChange={field.onChange}
                triggerRef={field.ref}
                options={clientOptions}
                disabled={noClients || clients.isPending}
                placeholder={clients.isPending ? t('clientsLoading') : noClients ? t('noClients') : t('clientPlaceholder')}
                error={fieldState.error?.message}
              />
            )}
          />
          {noClients ? (
            <p className="mt-1.5 text-body-sm text-muted-foreground">
              {t.rich('noClientsHint', {
                link: (chunks) => (
                  <Link href="/clients" className="font-medium text-primary underline-offset-4 hover:underline focus-visible:shadow-focus focus-visible:outline-none">
                    {chunks}
                  </Link>
                ),
              })}
            </p>
          ) : null}
        </div>
        <DateField label={t('startDate')} required error={errors.start_date?.message} {...register('start_date')} />
        <DateField
          label={t('endDate')}
          required
          min={startDate || undefined}
          error={errors.end_date?.message}
          {...register('end_date')}
        />
        <TextField
          label={t('budget')}
          placeholder={t('budgetPlaceholder')}
          required
          inputMode="decimal"
          autoComplete="off"
          error={errors.budget?.message}
          {...register('budget')}
        />
        <Controller
          control={control}
          name="priority"
          render={({ field, fieldState }) => (
            <SelectField
              label={t('priority')}
              value={field.value}
              onValueChange={field.onChange}
              triggerRef={field.ref}
              error={fieldState.error?.message}
              options={PROJECT_PRIORITIES.map((value) => ({ value, label: tPriority(value) }))}
            />
          )}
        />
        <Controller
          control={control}
          name="status"
          render={({ field, fieldState }) => (
            <SelectField
              label={t('status')}
              value={field.value}
              onValueChange={field.onChange}
              triggerRef={field.ref}
              error={fieldState.error?.message}
              options={PROJECT_STATUSES.map((value) => ({ value, label: tStatus(value) }))}
            />
          )}
        />
      </div>
    </FormModal>
  )
}
