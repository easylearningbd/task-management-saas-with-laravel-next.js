import type * as React from 'react'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/cn'

/* The card-header "View all" link from design/admin-dashboard (components/dashboard/lists.tsx):
   `body-sm` 500 in `primary-strong` (green text on a light ground — brand-book.md). */
const CLASSES =
  'inline-flex items-center gap-1 text-body-sm font-medium text-primary-strong hover:underline focus-visible:rounded-sm focus-visible:shadow-focus focus-visible:outline-none'

export function ViewAllLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className={CLASSES}>
      {label}
      <ChevronRight className="size-3.5" aria-hidden="true" />
    </Link>
  )
}

/** The same "View all" when it opens something on the page (a modal) instead of navigating.
 *  Extra button props pass through (ComingSoon adds aria-disabled and its classes). */
export function ViewAllButton({ label, className, ...props }: React.ComponentProps<'button'> & { label: string }) {
  return (
    <button type="button" className={cn(CLASSES, className)} {...props}>
      {label}
      <ChevronRight className="size-3.5" aria-hidden="true" />
    </button>
  )
}
