import { Skeleton } from '@/components/ui/skeleton'

/* Stand-in for the Create / Edit Plan card while the plan loads: same card, the 2-column
   field grid, the two panels and the footer buttons. */
export function PlanFormSkeleton() {
  return (
    <div aria-busy="true" className="rounded-xl border border-border bg-card p-6 shadow-xs">
      <div className="grid grid-cols-1 gap-x-6 gap-y-3.5 md:grid-cols-2">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="flex flex-col gap-1.5">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-control w-full rounded-lg" />
          </div>
        ))}
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-20 w-full rounded-lg" />
        </div>
      </div>
      {Array.from({ length: 2 }, (_, i) => (
        <div key={i} className="mt-6 rounded-xl border border-border p-4">
          <Skeleton className="h-6 w-24" />
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-full" />
          </div>
        </div>
      ))}
      <div className="mt-6 flex justify-end gap-3">
        <Skeleton className="h-control w-20 rounded-lg" />
        <Skeleton className="h-control w-28 rounded-lg" />
      </div>
    </div>
  )
}
