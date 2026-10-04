import { cn } from '@/lib/cn'

/* The TASK wordmark from the dashboard sidebar design: bold, tight, with the `T` in the
   brand's `primary` — one of the uses brand-book.md reserves emerald for. */
export function Logo({ label, className }: { /** Accessible name, e.g. t('common.appName') */ label: string; className?: string }) {
  return (
    <span
      className={cn('inline-block text-[40px] leading-none font-bold tracking-[-0.045em] text-foreground', className)}
      aria-label={label}
      role="img"
    >
      <span aria-hidden="true" className="text-primary">
        T
      </span>
      <span aria-hidden="true">ASK</span>
    </span>
  )
}
