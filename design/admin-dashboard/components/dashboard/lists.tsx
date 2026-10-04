import * as React from 'react'
import { ChevronRight } from 'lucide-react'
import { Card, CardHeader, Badge, Avatar } from '@/components/ui/primitives'
import { companies, topPlans } from '@/lib/dashboard-data'

function ViewAll() {
  return (
    <a
      href="#"
      className="inline-flex items-center gap-1 text-body-sm font-medium text-primary-strong hover:underline focus-visible:rounded-sm focus-visible:shadow-focus focus-visible:outline-none"
    >
      View all
      <ChevronRight className="size-3.5" />
    </a>
  )
}

/* Built from Card + Avatar + Badge. */
export function RecentCompanies() {
  return (
    <Card className="flex h-full flex-col">
      <CardHeader
        title="Recently Registered Companies"
        subtitle="Latest companies that joined the platform"
        action={<ViewAll />}
      />
      <ul className="flex flex-col gap-0.5 p-card pt-4 pb-1">
        {companies.map((c) => (
          <li key={c.email} className="flex items-center gap-3 rounded-lg px-2 py-3 transition-colors hover:bg-accent">
            <Avatar initials={c.initials} tone={c.tone} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-title-row">{c.name}</p>
              <p className="truncate text-body-sm text-muted-foreground">{c.email}</p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              <Badge tone="success">{c.status}</Badge>
              <span className="text-caption font-normal text-muted-foreground">{c.joined}</span>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  )
}

/* Built from Card + design-system/components/ProgressBar.md (rank circle, bar, caption). */
export function TopPlans() {
  return (
    <Card className="flex h-full flex-col">
      <CardHeader title="Top Plans" subtitle="By revenue generated" action={<ViewAll />} />
      <ul className="flex flex-col gap-6.5 p-card pt-5 pb-2">
        {topPlans.map((p) => (
          <li key={p.name} className="flex items-center gap-3">
            <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-primary-soft text-[13px] font-semibold text-primary-strong">
              {p.rank}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-body font-medium">{p.name}</p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-sm bg-track">
                <div
                  className="h-full rounded-sm bg-primary"
                  style={{ width: `${p.pct}%` }}
                  role="progressbar"
                  aria-valuenow={p.pct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${p.name} revenue share`}
                />
              </div>
              <p className="mt-1.5 text-caption font-normal text-muted-foreground">{p.subscribers}</p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-money">{p.revenue}</p>
              <p className="mt-1 text-caption font-normal text-muted-foreground">revenue</p>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  )
}
