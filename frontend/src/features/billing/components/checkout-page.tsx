'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Controller, useForm, useWatch, type FieldPath } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, CircleAlert, CircleCheck, Clock, PackageX } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { PageHeader } from '@/components/layout/app-shell'
import { usePageCrumb } from '@/components/layout/page-crumb'
import { FileDropzone } from '@/components/shared/file-dropzone'
import { TextareaField } from '@/components/shared/form-fields'
import { OrderSummaryCard } from '@/components/shared/order-summary-card'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardHeading } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { EmptyState } from '@/components/ui/empty-state'
import { Label } from '@/components/ui/label'
import { ProgressBar } from '@/components/ui/progress-bar'
import { RadioCardGroup } from '@/components/ui/radio-card-group'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from '@/components/ui/toast'
import { toApiError } from '@/lib/api-error'
import { useLeaveGuard } from '@/lib/use-leave-guard'
import { TextField } from '@/features/auth/components/text-field'
import { useAuthFormError } from '@/features/auth/components/use-auth-form-error'
import { priceFor, usePlanFormat } from '@/features/plans/utils'
import { usePlans, useSubmitPurchase } from '@/features/billing/api'
import { BankDetailsCard } from '@/features/billing/components/bank-details-card'
import {
  createCheckoutSchema,
  EMPTY_CHECKOUT_FORM,
  NOTES_MAX,
  RECEIPT_ACCEPT,
  RECEIPT_MAX_BYTES,
  REFERENCE_MAX,
  toPurchasePayload,
  type CheckoutFormValues,
} from '@/features/billing/schema'
import { PLAN_DURATIONS, type CatalogPlan, type PlanCatalog, type PlanDuration } from '@/features/billing/types'

/* /plans/checkout?plan={id}&duration={monthly|yearly} — PAGE SPEC B (no screenshot; built from the
   design system). Header "Complete Your Purchase" with a Back to Plans; breadcrumb Dashboard ›
   Plans › Checkout. Two columns from `lg` (stacked below):
   - left: "Payment Method" — RadioCardGroup (the Upgrade Plan modal's): Bank Transfer (selected),
     Stripe disabled with a "Coming soon" badge (never selectable — and the API refuses it anyway);
     the "Bank Details" panel from the global settings, each value with a copy button; "Payment
     Proof" — Transaction / Reference No. (optional, ≤ 100), Payment Receipt* (FileDropzone: JPG,
     PNG or PDF ≤ 5 MB, checked before anything uploads, image preview / PDF chip, remove), Notes;
   - right, sticky: "Order Summary" — plan, billing period, price, Discount "—", Total; the green
     "Submit for Approval" with the upload's progress, and the note that the plan activates on
     approval.
   The entry is guarded from the catalog: an unknown / inactive plan or a bad duration, the current
   plan + duration, a pending order, or a $0 plan each show why, with a way back — never the form.
   Submit: a PENDING order with its receipt; a toast; then Plan Requests, the new row on top.
   Field errors (the server's too) show under their field, anything else above the
   form. Leaving with unsaved input asks first (useLeaveGuard). */

const FIELDS = ['payment_method', 'receipt', 'payment_reference', 'notes'] as const satisfies ReadonlyArray<FieldPath<CheckoutFormValues>>

type Entry =
  | { kind: 'ok'; plan: CatalogPlan; duration: PlanDuration }
  | { kind: 'unavailable' }
  | { kind: 'current'; plan: CatalogPlan; duration: PlanDuration }
  | { kind: 'pending' }
  | { kind: 'free'; plan: CatalogPlan }

function resolveEntry(catalog: PlanCatalog, planParam: string | null, durationParam: string | null): Entry {
  const duration = (PLAN_DURATIONS as ReadonlyArray<string>).includes(durationParam ?? '') ? (durationParam as PlanDuration) : null
  const plan = /^[1-9]\d*$/.test(planParam ?? '') ? catalog.plans.find((p) => p.id === Number(planParam)) : undefined
  if (!plan || !duration) return { kind: 'unavailable' }
  if (catalog.current.plan_id === plan.id && catalog.current.duration === duration) return { kind: 'current', plan, duration }
  if (catalog.pending_order) return { kind: 'pending' }
  if (Number(priceFor(plan, duration)) === 0) return { kind: 'free', plan }
  return { kind: 'ok', plan, duration }
}

export function CheckoutPage() {
  const t = useTranslations('billing.checkout')
  const search = useSearchParams()
  const catalog = usePlans()
  const [submitted, setSubmitted] = React.useState(false)
  // Captured on the first load: a submission (or anything else) refreshing the catalog must not
  // swap the form for a guard message mid-flight.
  const [entry, setEntry] = React.useState<Entry | null>(null)
  if (entry === null && catalog.data) setEntry(resolveEntry(catalog.data, search.get('plan'), search.get('duration')))

  usePageCrumb(t('crumb'))

  if (catalog.isError && !catalog.data) {
    return (
      <>
        <PageHeader title={t('title')} subtitle={t('subtitle')} action={<BackButton />} />
        <EmptyState
          framed
          className="mt-4"
          tone="danger"
          icon={CircleAlert}
          title={t('error.title')}
          description={toApiError(catalog.error).message}
          action={
            <Button variant="outline" onClick={() => void catalog.refetch()}>
              {t('error.retry')}
            </Button>
          }
        />
      </>
    )
  }

  if (!catalog.data || entry === null) return <CheckoutSkeleton />

  if (entry.kind !== 'ok') {
    return (
      <>
        <PageHeader title={t('title')} subtitle={t('subtitle')} action={<BackButton />} />
        <EntryRefused entry={entry} />
      </>
    )
  }

  return <CheckoutForm plan={entry.plan} duration={entry.duration} catalog={catalog.data} submitted={submitted} onSubmitted={() => setSubmitted(true)} />
}

function CheckoutForm({
  plan,
  duration,
  catalog,
  submitted,
  onSubmitted,
}: {
  plan: CatalogPlan
  duration: PlanDuration
  catalog: PlanCatalog
  submitted: boolean
  onSubmitted: () => void
}) {
  const t = useTranslations('billing.checkout')
  const tValidation = useTranslations('billing.validation')
  const f = usePlanFormat()
  const router = useRouter()
  const submit = useSubmitPurchase()
  const [progress, setProgress] = React.useState<number | null>(null)
  const receiptId = React.useId()
  const hintId = React.useId()

  const schema = React.useMemo(() => createCheckoutSchema(tValidation), [tValidation])
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isDirty },
  } = useForm<CheckoutFormValues>({ resolver: zodResolver(schema), defaultValues: EMPTY_CHECKOUT_FORM })
  const method = useWatch({ control, name: 'payment_method' })
  const { formError, setFormError, handleError } = useAuthFormError(setError, FIELDS)
  const leave = useLeaveGuard(isDirty && !submitted)

  const price = f.money(priceFor(plan, duration))

  const onSubmit = (values: CheckoutFormValues) => {
    setFormError(null)
    setProgress(0)
    submit.mutate(
      { ...toPurchasePayload(values, plan.id, duration), onProgress: setProgress },
      {
        onSuccess: () => {
          onSubmitted()
          toast.success(t('submitted'))
          router.push('/plans/requests')
        },
        onError: handleError,
        onSettled: () => setProgress(null),
      },
    )
  }

  return (
    <>
      <PageHeader title={t('title')} subtitle={t('subtitle')} action={<BackButton onBack={() => leave.request('/plans')} />} />

      <form noValidate onSubmit={handleSubmit(onSubmit)} className="mt-4 grid grid-cols-1 items-start gap-4 lg:grid-cols-3">
        <div className="flex min-w-0 flex-col gap-4 lg:col-span-2">
          {formError ? <Alert tone="danger">{formError}</Alert> : null}

          <Card>
            <CardHeading divided title={t('paymentMethod.title')} />
            <div className="p-card">
              <Controller
                control={control}
                name="payment_method"
                render={({ field }) => (
                  <RadioCardGroup
                    label={t('paymentMethod.label')}
                    value={field.value}
                    onValueChange={field.onChange}
                    options={[
                      {
                        value: 'bank_transfer',
                        title: <span className="text-title-row">{t('paymentMethod.bank.title')}</span>,
                        description: <span className="text-body-sm text-muted-foreground">{t('paymentMethod.bank.description')}</span>,
                      },
                      {
                        value: 'stripe',
                        disabled: true,
                        title: (
                          <>
                            <span className="text-title-row">{t('paymentMethod.stripe.title')}</span>
                            <Badge tone="neutral" size="sm">
                              {t('paymentMethod.stripe.soon')}
                            </Badge>
                          </>
                        ),
                        description: <span className="text-body-sm text-muted-foreground">{t('paymentMethod.stripe.description')}</span>,
                      },
                    ]}
                  />
                )}
              />
              {errors.payment_method?.message ? <p className="mt-2 text-body-sm text-destructive">{errors.payment_method.message}</p> : null}
            </div>
          </Card>

          {method === 'bank_transfer' ? <BankDetailsCard details={catalog.bank_details} /> : null}

          <Card>
            <CardHeading divided title={t('proof.title')} />
            <div className="flex flex-col gap-4.5 p-card">
              <TextField
                label={t('proof.reference')}
                placeholder={t('proof.referencePlaceholder')}
                autoComplete="off"
                maxLength={REFERENCE_MAX}
                error={errors.payment_reference?.message}
                {...register('payment_reference')}
              />
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={receiptId} required>
                  {t('proof.receipt')}
                </Label>
                <Controller
                  control={control}
                  name="receipt"
                  render={({ field, fieldState }) => (
                    <FileDropzone
                      id={receiptId}
                      value={field.value instanceof File ? field.value : null}
                      onChange={field.onChange}
                      accept={RECEIPT_ACCEPT}
                      maxBytes={RECEIPT_MAX_BYTES}
                      hint={t('proof.receiptHint')}
                      error={fieldState.error?.message}
                      disabled={submit.isPending}
                      describedBy={hintId}
                    />
                  )}
                />
                <span id={hintId} className="sr-only">
                  {t('proof.receiptHint')}
                </span>
              </div>
              <TextareaField
                label={t('proof.notes')}
                placeholder={t('proof.notesPlaceholder')}
                maxLength={NOTES_MAX}
                error={errors.notes?.message}
                {...register('notes')}
              />
            </div>
          </Card>
        </div>

        <OrderSummaryCard
          title={t('summary.title')}
          className="lg:sticky lg:top-[calc(var(--spacing-topbar)+1rem)]"
          rows={[
            { id: 'plan', label: t('summary.plan'), value: <span className="font-medium">{plan.name}</span> },
            { id: 'period', label: t('summary.period'), value: t(`summary.${duration}`) },
            { id: 'price', label: t('summary.price'), value: <span className="font-mono text-money">{price}</span> },
            { id: 'discount', label: t('summary.discount'), value: <span className="text-muted-foreground">{t('summary.none')}</span> },
          ]}
          total={{ label: t('summary.total'), value: <span className="font-mono">{price}</span> }}
        >
          <Button type="submit" className="w-full" loading={submit.isPending} disabled={submit.isPending || submitted}>
            {t('summary.submit')}
          </Button>
          {progress !== null ? (
            <div className="flex flex-col gap-1.5" aria-live="polite">
              <ProgressBar value={progress} label={t('summary.uploadLabel')} />
              <p className="text-body-sm text-muted-foreground">{t('summary.uploading', { percent: Math.round(progress) })}</p>
            </div>
          ) : null}
          <p className="text-center text-body-sm text-muted-foreground">{t('summary.note')}</p>
        </OrderSummaryCard>
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

/** Why the checkout can't open for this link — with the way back. */
function EntryRefused({ entry }: { entry: Exclude<Entry, { kind: 'ok' }> }) {
  const t = useTranslations('billing.checkout.guard')
  const tSummary = useTranslations('billing.checkout.summary')
  const back = (
    <Button asChild variant="outline">
      <Link href="/plans">{t('backToPlans')}</Link>
    </Button>
  )

  if (entry.kind === 'current') {
    return (
      <EmptyState
        framed
        className="mt-4"
        icon={CircleCheck}
        title={t('current.title')}
        description={t('current.description', { plan: entry.plan.name, duration: tSummary(entry.duration) })}
        action={back}
      />
    )
  }
  if (entry.kind === 'pending') {
    return (
      <EmptyState
        framed
        className="mt-4"
        icon={Clock}
        title={t('pending.title')}
        description={t('pending.description')}
        action={
          <Button asChild>
            <Link href="/plans/requests">{t('viewRequests')}</Link>
          </Button>
        }
      />
    )
  }
  if (entry.kind === 'free') {
    return <EmptyState framed className="mt-4" icon={CircleCheck} title={t('free.title')} description={t('free.description', { plan: entry.plan.name })} action={back} />
  }
  return <EmptyState framed className="mt-4" icon={PackageX} title={t('unavailable.title')} description={t('unavailable.description')} action={back} />
}

function BackButton({ onBack }: { onBack?: () => void }) {
  const t = useTranslations('billing.checkout')
  const content = (
    <>
      <ArrowLeft className="size-icon" aria-hidden="true" />
      {t('back')}
    </>
  )
  return onBack ? (
    <Button variant="outline" size="sm" onClick={onBack}>
      {content}
    </Button>
  ) : (
    <Button asChild variant="outline" size="sm">
      <Link href="/plans">{content}</Link>
    </Button>
  )
}

function CheckoutSkeleton() {
  const t = useTranslations('billing.checkout')
  return (
    <div aria-busy="true">
      <span className="sr-only" role="status">
        {t('loading')}
      </span>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-7 w-64 max-w-full" />
          <Skeleton className="h-4 w-96 max-w-full" />
        </div>
        <Skeleton className="h-control-sm w-20 rounded-lg" />
      </div>
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <Skeleton className="h-56 w-full rounded-xl" />
          <Skeleton className="h-48 w-full rounded-xl" />
          <Skeleton className="h-72 w-full rounded-xl" />
        </div>
        <Skeleton className="h-80 w-full rounded-xl" />
      </div>
    </div>
  )
}
