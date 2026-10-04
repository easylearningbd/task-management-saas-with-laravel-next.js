import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

/* The card-header "View all" link from design/admin-dashboard (components/dashboard/lists.tsx):
   `body-sm` 500 in `primary-strong` (green text on a light ground — brand-book.md). */
export function ViewAllLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 text-body-sm font-medium text-primary-strong hover:underline focus-visible:rounded-sm focus-visible:shadow-focus focus-visible:outline-none"
    >
      {label}
      <ChevronRight className="size-3.5" aria-hidden="true" />
    </Link>
  )
}
