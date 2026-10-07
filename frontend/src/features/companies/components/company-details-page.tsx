'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Calendar, CircleAlert, CreditCard } from 'lucide-react'
import { useFormatter, useTranslations } from 'next-intl'
import { usePageCrumb } from '@/components/layout/page-crumb'
import { DetailList } from '@/components/shared/detail-list'
import { RowActions } from '@/components/shared/row-actions'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeading } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { ProgressBar } from '@/components/ui/progress-bar'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { ViewAllButton } from '@/features/admin-dashboard/components/view-all-link'
import { useCompany } from '@/features/companies/api'
import { ActivityRow } from '@/features/companies/components/activity-history-modal'
import { PlanBadge, StatusBadge } from '@/features/companies/components/company-columns'
import { CompanyNotFound } from '@/features/companies/components/company-not-found'
import { useCompanyActionDialogs } from '@/features/companies/components/use-company-action-dialogs'
import { deadline, formatBytes, formatDate, formatDateTime, gigabytesToBytes } from '@/features/companies/format'
import type { CompanyDetail } from '@/features/companies/types'
import { usePlanFormat } from '@/features/plans/utils'
import { toApiError } from '@/lib/api-error'
import { cn } from '@/lib/cn'
import { useHydrated } from '@/lib/use-hydrated'

/* /admin/companies/{id} — PAGE SPEC D. Below the page header (title + Back): the header card
   (80px avatar, name, email, status + plan badges, "Member since") with the row's actions
   minus "details", then four cards — Subscription (plan, billing, expiry, trial, Upgrade
   Plan), Account (login switch, status, email verification, last update), Usage (projects
   and storage against the plan's limits) and Recent Activity (the latest five log entries,
   "View all" → the company's Activity History). Two columns from `lg`, one below.
   The server component loads the company (a missing or deleted id is a real 404); this page
   keeps it live through the shared `useCompany` query, so every action refreshes the cards.
   Dates in the viewer's zone and "expires in N days" render after hydration only. */

/** A bar turns `warning` from this share of the limit (ProgressBar.md: "nearing it"). */
const NEARING_LIMIT = 80
/** "Expires in N days" turns `warning` within this many days. */
const EXPIRY_WARNING_DAYS = 7

export function CompanyDetailsPage({ initial }: { initial: CompanyDetail }) {
  const t = useTranslations('companies.details')
  const router = useRouter()
  const query = useCompany(initial.id, { initialData: initial })
  const company = query.data

  usePageCrumb(company?.name ?? null)

  const { actionsFor, dialogs, openHistory, openUpgrade, onToggleLogin } = useCompanyActionDialogs({
    onDeleted: React.useCallback(() => router.replace('/admin/companies'), [router]),
  })

  let body: React.ReactNode
  if (query.isError && toApiError(query.error).status === 404) {
    // Deleted (or gone) while the page was open.
    body = <CompanyNotFound />
  } else if (!company) {
    body = query.isError ? (
      <EmptyState
        framed
        className="mt-4"
        icon={CircleAlert}
        tone="danger"
        title={t('error.title')}
        description={toApiError(query.error).message}
        action={
          <Button variant="outline" onClick={() => query.refetch()}>
            {t('error.retry')}
          </Button>
        }
      />
    ) : (
      <CompanyDetailsSkeleton />
    )
  } else {
    body = (
      <div className="mt-4 flex flex-col gap-4">
        <HeaderCard company={company} actions={<RowActions actions={actionsFor(company)} className="flex-wrap justify-start" />} />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <SubscriptionCard company={company} onUpgrade={() => openUpgrade(company)} />
          <AccountCard company={company} onToggleLogin={() => onToggleLogin(company)} />
          <UsageCard company={company} />
          <ActivityCard company={company} onViewAll={() => openHistory({ company: { id: company.id, name: company.name } })} />
        </div>
      </div>
    )
  }

  return (
    <>
      {body}
      {dialogs}
    </>
  )
}

/* ── Cards ── */

function HeaderCard({ company, actions }: { company: CompanyDetail; actions: React.ReactNode }) {
  const t = useTranslations('companies.details')
  const since = useLocalDate(company.created_at)

  return (
    <Card className="flex flex-col gap-4 p-card sm:flex-row sm:items-center">
      <Avatar size="lg" name={company.name} seed={company.id} src={company.avatar_url} />
      <div className="min-w-0 flex-1">
        <h2 className="text-title-section break-words">{company.name}</h2>
        <p className="text-body break-all text-muted-foreground">{company.email}</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <StatusBadge company={company} />
          <PlanBadge company={company} emptyLabel={t('noPlan')} />
          {company.created_at ? (
            <span className="inline-flex items-center gap-1.5 text-body-sm text-muted-foreground-alt">
              <Calendar className="size-icon shrink-0" aria-hidden="true" />
              {since ? (
                <time dateTime={company.created_at}>{t('memberSince', { date: since })}</time>
              ) : (
                <Skeleton className="h-4 w-36" />
              )}
            </span>
          ) : null}
        </div>
      </div>
      <div role="group" aria-label={t('actionsLabel', { name: company.name })} className="sm:self-start">
        {actions}
      </div>
    </Card>
  )
}

function SubscriptionCard({ company, onUpgrade }: { company: CompanyDetail; onUpgrade: () => void }) {
  const t = useTranslations('companies.details.subscription')
  const td = useTranslations('companies.details')
  const f = usePlanFormat()
  const plan = company.plan
  const yearly = company.plan_duration === 'yearly'

  return (
    <Card>
      <CardHeading
        title={t('title')}
        subtitle={t('subtitle')}
        action={
          <Button variant="outline" size="sm" onClick={onUpgrade}>
            <CreditCard className="size-icon" aria-hidden="true" />
            {t('upgrade')}
          </Button>
        }
      />
      <CardContent>
        <DetailList
          items={[
            { id: 'plan', label: t('plan'), value: <PlanBadge company={company} emptyLabel={td('noPlan')} /> },
            { id: 'duration', label: t('duration'), value: plan ? company.plan_duration_label : null },
            {
              id: 'price',
              label: t('price'),
              value: plan ? (
                <span className="inline-flex items-baseline gap-1">
                  <span className="font-mono text-money text-foreground">{f.money(yearly ? plan.yearly_price : plan.monthly_price)}</span>
                  <span className="text-body-sm text-muted-foreground">{yearly ? t('perYear') : t('perMonth')}</span>
                </span>
              ) : null,
            },
            {
              id: 'expiry',
              label: t('expiry'),
              value: plan ? <ExpiryValue iso={company.plan_expires_at} /> : null,
            },
            ...(company.trial_ends_at ? [{ id: 'trial', label: t('trialEnd'), value: <TrialValue iso={company.trial_ends_at} /> }] : []),
          ]}
        />
      </CardContent>
    </Card>
  )
}

/** "2026-11-07 · Expires in 31 days", "2026-09-01 · Expired" (danger) or "Never expires". */
function ExpiryValue({ iso }: { iso: string | null }) {
  const t = useTranslations('companies.details.subscription')
  const date = useLocalDate(iso)
  const state = useDeadline(iso)

  if (!iso) return <span className="text-muted-foreground">{t('neverExpires')}</span>
  if (!date || !state) return <Skeleton className="h-5 w-40" />

  return (
    <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
      <time dateTime={iso}>{date}</time>
      {state.past ? (
        <Badge tone="danger" outlined>
          {t('expired')}
        </Badge>
      ) : (
        <span className={cn('text-body-sm', state.days <= EXPIRY_WARNING_DAYS ? 'text-warning' : 'text-muted-foreground')}>
          {state.days === 0 ? t('expiresToday') : t('expiresIn', { count: state.days })}
        </span>
      )}
    </span>
  )
}

/** "2026-10-14 · 7 days left" or "2026-09-30 · Ended". */
function TrialValue({ iso }: { iso: string }) {
  const t = useTranslations('companies.details.subscription')
  const date = useLocalDate(iso)
  const state = useDeadline(iso)
  if (!date || !state) return <Skeleton className="h-5 w-40" />

  return (
    <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
      <time dateTime={iso}>{date}</time>
      <span className="text-body-sm text-muted-foreground">
        {state.past ? t('trialEnded') : state.days === 0 ? t('trialEndsToday') : t('trialEndsIn', { count: state.days })}
      </span>
    </span>
  )
}

function AccountCard({ company, onToggleLogin }: { company: CompanyDetail; onToggleLogin: () => void }) {
  const t = useTranslations('companies.details.account')
  const verifiedOn = useLocalDate(company.email_verified_at)
  const updated = useLocalDateTime(company.updated_at)
  const enabled = company.is_login_enabled
  // Turning login on needs a password (the server answers 422 otherwise).
  const blocked = !enabled && !company.has_password

  return (
    <Card>
      <CardHeading title={t('title')} subtitle={t('subtitle')} />
      <CardContent>
        <DetailList
          items={[
            {
              id: 'login',
              label: t('login'),
              wide: blocked,
              value: (
                <span className="flex flex-col gap-1">
                  <span className="inline-flex items-center gap-2">
                    <Switch
                      checked={enabled}
                      onCheckedChange={onToggleLogin}
                      disabled={blocked}
                      aria-label={t('loginToggleLabel', { name: company.name })}
                    />
                    <span>{enabled ? t('loginEnabled') : t('loginDisabled')}</span>
                  </span>
                  {blocked ? <span className="text-body-sm text-muted-foreground">{t('noPassword')}</span> : null}
                </span>
              ),
            },
            { id: 'status', label: t('status'), value: <StatusBadge company={company} /> },
            {
              id: 'verified',
              label: t('emailVerified'),
              value: company.email_verified_at ? (
                <span className="inline-flex flex-wrap items-center gap-2">
                  <Badge tone="success" outlined>
                    {t('verified')}
                  </Badge>
                  {verifiedOn ? (
                    <time dateTime={company.email_verified_at} className="text-body-sm text-muted-foreground-alt">
                      {verifiedOn}
                    </time>
                  ) : null}
                </span>
              ) : (
                <Badge tone="neutral" outlined>
                  {t('notVerified')}
                </Badge>
              ),
            },
            {
              id: 'updated',
              label: t('lastUpdated'),
              value: company.updated_at ? updated ? <time dateTime={company.updated_at}>{updated}</time> : <Skeleton className="h-5 w-36" /> : null,
            },
          ]}
        />
      </CardContent>
    </Card>
  )
}

/* TODO(usage): `usage` is all zeros from the API until the Projects and Media Library modules
   exist (CompanyDetailResource) — this card already reads the real fields, so it goes live
   without changes. Never estimate or fake these numbers here. */
function UsageCard({ company }: { company: CompanyDetail }) {
  const t = useTranslations('companies.details.usage')
  const td = useTranslations('companies.details')
  const format = useFormatter()
  const f = usePlanFormat()
  const { max_projects: maxProjects, storage_limit_gb: storageGb } = company.limits
  const { projects, storage_bytes: storageBytes } = company.usage

  const projectLimit = maxProjects === null ? td('noPlan') : maxProjects === -1 ? t('unlimited') : format.number(maxProjects)
  const projectPct = maxProjects !== null && maxProjects > 0 ? (projects / maxProjects) * 100 : 0

  const storageBytesLimit = storageGb === null ? 0 : gigabytesToBytes(storageGb)
  const storageLimit = storageGb === null ? td('noPlan') : f.storage({ storage_limit_gb: storageGb })
  const storagePct = storageBytesLimit > 0 ? (storageBytes / storageBytesLimit) * 100 : 0

  return (
    <Card>
      <CardHeading title={t('title')} subtitle={t('subtitle')} />
      <CardContent className="flex flex-col gap-5">
        <UsageMeter
          label={t('projects')}
          barLabel={t('projectsBar')}
          value={t('of', { used: format.number(projects), limit: projectLimit })}
          pct={projectPct}
        />
        <UsageMeter
          label={t('storage')}
          barLabel={t('storageBar')}
          value={t('of', { used: formatBytes(storageBytes), limit: storageLimit })}
          pct={storagePct}
        />
      </CardContent>
    </Card>
  )
}

function UsageMeter({ label, barLabel, value, pct }: { label: string; barLabel: string; value: string; pct: number }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-4">
        <span className="text-body-sm text-muted-foreground">{label}</span>
        <span className="text-body text-foreground">{value}</span>
      </div>
      <ProgressBar value={pct} label={barLabel} tone={pct >= NEARING_LIMIT ? 'warning' : 'primary'} />
    </div>
  )
}

function ActivityCard({ company, onViewAll }: { company: CompanyDetail; onViewAll: () => void }) {
  const t = useTranslations('companies.details.activity')
  const th = useTranslations('companies.history')
  const entries = company.recent_activities

  return (
    <Card>
      <CardHeading title={t('title')} subtitle={t('subtitle')} action={<ViewAllButton onClick={onViewAll} label={t('viewAll')} />} />
      <CardContent className="pt-2">
        {entries.length === 0 ? (
          <p className="py-3 text-body text-muted-foreground">{t('empty')}</p>
        ) : (
          <ul aria-label={th('listLabel')} className="divide-y divide-border">
            {entries.map((entry) => (
              <ActivityRow key={entry.id} entry={entry} showCompany={false} />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

/* ── Skeleton (loading.tsx and the client fallback) ── */

export function CompanyDetailsSkeleton() {
  return (
    <div className="mt-4 flex flex-col gap-4" aria-hidden="true">
      <Card className="flex flex-col gap-4 p-card sm:flex-row sm:items-center">
        <Skeleton className="size-20 rounded-full" />
        <div className="flex flex-1 flex-col gap-2">
          <Skeleton className="h-6.5 w-56 max-w-full" />
          <Skeleton className="h-5 w-44 max-w-full" />
          <div className="mt-1 flex gap-2">
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-6 w-36" />
          </div>
        </div>
      </Card>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {Array.from({ length: 4 }, (_, i) => (
          <Card key={i}>
            <div className="flex flex-col gap-1.5 p-card pb-0">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-56 max-w-full" />
            </div>
            <div className="grid grid-cols-1 gap-x-6 gap-y-4.5 p-card sm:grid-cols-2">
              {Array.from({ length: 4 }, (_, j) => (
                <div key={j} className="flex flex-col gap-1.5">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-5 w-32" />
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

/* ── Viewer-local time (after hydration only) ── */

function useLocalDate(iso: string | null): string | null {
  return useHydrated() ? formatDate(iso) : null
}

function useLocalDateTime(iso: string | null): string | null {
  return useHydrated() ? formatDateTime(iso) : null
}

/** Where a deadline stands from the viewer's clock at mount; null before hydration. */
function useDeadline(iso: string | null) {
  const hydrated = useHydrated()
  const [now] = React.useState(() => Date.now())
  return hydrated ? deadline(iso, now) : null
}
