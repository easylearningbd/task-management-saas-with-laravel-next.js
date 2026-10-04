import { cn } from '@/lib/cn'

/* Not in the design system (approved for the admin dashboard): a `muted` block that takes
   the shape of the content it stands in for. Size and radius come from the caller so each
   skeleton matches its real card. */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn('animate-pulse rounded-md bg-muted', className)} />
}
