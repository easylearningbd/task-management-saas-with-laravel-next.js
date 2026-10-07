import { ChartBodySkeleton } from '@/components/shared/charts/chart-parts'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

/* Loading state shaped like the real sections — hero, four 123px stat cards, the two
   two-column rows of divided cards, both charts and the list rows — same grid, gaps and
   radii, so nothing jumps when the data lands. */

function DividedHeadSkeleton({ action = true }: { action?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border px-card py-4.5">
      <div className="flex flex-col gap-1.5">
        <Skeleton className="h-5 w-44" />
        <Skeleton className="h-3.5 w-56 max-w-full" />
      </div>
      {action ? <Skeleton className="h-control-sm w-16 rounded-lg" /> : null}
    </div>
  )
}

function RowsSkeleton({ rows, aside = true }: { rows: number; aside?: boolean }) {
  return (
    <div className="divide-y divide-border">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3 px-card py-3.5">
          <Skeleton className="size-9 rounded-lg" />
          <div className="flex flex-1 flex-col gap-1.5">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3.5 w-1/2" />
          </div>
          {aside ? (
            <div className="flex flex-col items-end gap-1.5">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-6 w-16 rounded-md" />
            </div>
          ) : null}
        </div>
      ))}
    </div>
  )
}

function ChartSkeleton() {
  return (
    <Card>
      <div className="flex items-start justify-between gap-4 p-card pb-0">
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-3.5 w-60 max-w-full" />
        </div>
        <Skeleton className="h-control-sm w-36 rounded-lg" />
      </div>
      <ChartBodySkeleton />
    </Card>
  )
}

export function CompanyDashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true">
      <Skeleton className="h-36 rounded-xl" />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-[123px] rounded-xl" />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card>
          <DividedHeadSkeleton />
          <RowsSkeleton rows={3} />
        </Card>
        <Card>
          <DividedHeadSkeleton />
          <div className="flex flex-wrap items-center gap-5 px-card py-4">
            <Skeleton className="mx-auto size-36 rounded-full" />
            <div className="flex min-w-[min(260px,100%)] flex-1 flex-col gap-2.5">
              <Skeleton className="h-6.5 w-3/4" />
              <Skeleton className="h-6 w-20 rounded-md" />
              <Skeleton className="h-16 w-full rounded-lg" />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Skeleton className="h-16 rounded-lg" />
                <Skeleton className="h-16 rounded-lg" />
              </div>
            </div>
          </div>
        </Card>
      </div>

      <ChartSkeleton />
      <ChartSkeleton />

      {[0, 1].map((row) => (
        <div key={row} className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {[0, 1].map((col) => (
            <Card key={col}>
              <DividedHeadSkeleton action={!(row === 0 && col === 0)} />
              <RowsSkeleton rows={row === 0 ? 3 : 5} />
            </Card>
          ))}
        </div>
      ))}
    </div>
  )
}
