import { Skeleton } from '@/components/ui/skeleton'

/* Stand-in for a plan card while the list loads: same frame, padding and sections. */
export function PlanCardSkeleton() {
  return (
    <div aria-hidden="true" className="flex h-full flex-col rounded-xl border border-border bg-card shadow-xs">
      <div className="flex flex-col items-center px-6 pt-6 pb-6">
        <Skeleton className="h-7 w-24" />
        <Skeleton className="mt-2 h-10 w-40" />
        <Skeleton className="mt-4 h-4 w-56 max-w-full" />
        <Skeleton className="mt-2 h-4 w-40" />
      </div>
      <div className="flex flex-1 flex-col gap-3 border-t border-border p-6">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-full" />
        <Skeleton className="mt-3 h-4 w-20" />
        <Skeleton className="h-5 w-36" />
        <Skeleton className="mt-6 h-13 w-full rounded-lg" />
      </div>
    </div>
  )
}
