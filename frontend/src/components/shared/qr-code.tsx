'use client'

import * as React from 'react'
import { generate } from 'lean-qr'
import { toSvgPath } from 'lean-qr/extras/svg'
import { cn } from '@/lib/cn'

/* A QR code for `value` (the invoice's public link) — drawn as one SVG path (lean-qr: no canvas, no
   image, no colour of its own). The modules are `foreground` on a `card` ground inside
   `.theme-light`, so they stay dark-on-light in both themes (a QR scans reliably only that way), with
   a 2-module quiet zone around it inside the SVG. `size` is the rendered width / height in px.
   `label` is the image's accessible name ("QR code — scan to view the invoice online"). */

const QUIET = 2

export function QrCode({ value, size, label, className }: { value: string; size: number; label: string; className?: string }) {
  const { path, modules } = React.useMemo(() => {
    const code = generate(value)
    return { path: toSvgPath(code), modules: code.size }
  }, [value])

  return (
    <span className={cn('theme-light inline-flex rounded-lg bg-card text-foreground', className)}>
      <svg
        role="img"
        aria-label={label}
        width={size}
        height={size}
        viewBox={`${-QUIET} ${-QUIET} ${modules + QUIET * 2} ${modules + QUIET * 2}`}
        shapeRendering="crispEdges"
      >
        <path d={path} fill="currentColor" />
      </svg>
    </span>
  )
}
