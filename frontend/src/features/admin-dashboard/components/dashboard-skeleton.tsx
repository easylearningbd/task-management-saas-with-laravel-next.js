import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ChartBodySkeleton } from '@/features/admin-dashboard/components/chart-parts'

/* Loading state shaped like the real sections: hero, five 164px stat tiles, the 3/2 list
   row, and the two charts — same grid, gaps and radii, so nothing jumps when data lands. */

function CardHeadingSkeleton() {
  return (
    <div className="flex items-start justify-between gap-4 p-card pb-0">
      <div className="flex flex-col gap-1.5">
        <Skeleton className="h-5 w-44" />
        <Skeleton className="h-3.5 w-60 max-w-full" />
      </div>
      <Skeleton className="h-control-sm w-20 rounded-lg" />
    </div>
  )
}

export function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true">
      <Skeleton className="h-36 rounded-xl" />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-41 rounded-xl" />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeadingSkeleton />
          <ul className="flex flex-col gap-0.5 p-card pt-4 pb-1">
            {Array.from({ length: 5 }, (_, i) => (
              <li key={i} className="flex items-center gap-3 px-2 py-3">
                <Skeleton className="size-avatar rounded-full" />
                <div className="flex flex-1 flex-col gap-1.5">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3.5 w-52 max-w-full" />
                </div>
                <Skeleton className="h-6 w-14" />
              </li>
            ))}
          </ul>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeadingSkeleton />
          <ul className="flex flex-col gap-6.5 p-card pt-5 pb-2">
            {Array.from({ length: 3 }, (_, i) => (
              <li key={i} className="flex items-center gap-3">
                <Skeleton className="size-7 rounded-full" />
                <div className="flex flex-1 flex-col gap-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-1.5 w-full rounded-sm" />
                  <Skeleton className="h-3.5 w-20" />
                </div>
                <Skeleton className="h-8 w-16" />
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {Array.from({ length: 2 }, (_, i) => (
        <Card key={i}>
          <CardHeadingSkeleton />
          <ChartBodySkeleton />
        </Card>
      ))}
    </div>
  )
}
