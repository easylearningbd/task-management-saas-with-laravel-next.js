'use client'

import { Moon } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/cn'

/* The top bar's dark-mode button from the dashboard designs: a `control-height` square,
   outline style, `Moon` glyph (brand-book.md iconography). Toggles `.dark` on <html>. */
export function ThemeToggle({ className }: { className?: string }) {
  const t = useTranslations('common')
  const { resolvedTheme, setTheme } = useTheme()

  return (
    <button
      type="button"
      onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
      aria-label={t('toggleTheme')}
      className={cn(
        'inline-flex size-control shrink-0 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground shadow-sm transition-colors',
        'hover:bg-accent hover:text-foreground focus-visible:border-ring focus-visible:shadow-focus focus-visible:outline-none',
        className,
      )}
    >
      <Moon className="size-icon-lg" strokeWidth={1.75} aria-hidden="true" />
    </button>
  )
}
