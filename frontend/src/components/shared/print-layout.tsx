'use client'

import * as React from 'react'
import { Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/cn'

/* A standalone printable document page (the public invoice, /i/{token}) — no app chrome. Always the
   LIGHT theme (`.theme-light`: a document reads the same in a dark-mode browser and on paper), on
   the `background` canvas; the document is one centred `card` sheet (Card.md: 1px `border`,
   `radius-xl`, `shadow-xs`), at most 896px wide, with `actions` (e.g. PrintButton) right-aligned
   above it. Printing: the actions and the canvas drop out (`print:`), the sheet loses its frame and
   fills the page, and table rows don't split across pages (`break-inside-avoid`). */

export function PrintLayout({ actions, children, className }: { actions?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <div className="theme-light min-h-dvh bg-background text-foreground print:min-h-0 print:bg-card">
      <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 print:max-w-none print:p-0">
        {actions ? <div className="mb-4 flex justify-end gap-2 print:hidden">{actions}</div> : null}
        <article
          className={cn(
            // print-color-adjust: the document's fills (a table header, panels) print as shown.
            'rounded-xl border border-border bg-card shadow-xs [print-color-adjust:exact] [&_tr]:break-inside-avoid',
            'print:rounded-none print:border-0 print:shadow-none',
            className,
          )}
        >
          {children}
        </article>
      </div>
    </div>
  )
}

/** The outline "Print" button (`Printer` glyph) — opens the browser's print dialog. */
export function PrintButton({ label }: { label: string }) {
  return (
    <Button type="button" variant="outline" size="sm" onClick={() => window.print()}>
      <Printer className="size-icon" aria-hidden="true" />
      {label}
    </Button>
  )
}
