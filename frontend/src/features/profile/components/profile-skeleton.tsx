import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

/* Stand-in for "Profile Information" while the profile loads: same card padding, heading,
   80px avatar + button + hint row, two label/input pairs and the Save button. */
export function ProfileCardSkeleton() {
  return (
    <Card className="p-card" aria-busy="true">
      <Skeleton className="h-6 w-48" />
      <Skeleton className="mt-2 h-5 w-96 max-w-full" />
      <div className="mt-6 flex items-center gap-6">
        <Skeleton className="size-20 rounded-full" />
        <div className="flex flex-col gap-2">
          <Skeleton className="h-control w-38 rounded-lg" />
          <Skeleton className="h-4 w-36" />
        </div>
      </div>
      <div className="mt-5 flex flex-col gap-5">
        {Array.from({ length: 2 }, (_, i) => (
          <div key={i} className="flex flex-col gap-1.5">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-control w-full rounded-lg" />
          </div>
        ))}
        <Skeleton className="mt-1 h-control w-16 rounded-lg" />
      </div>
    </Card>
  )
}
