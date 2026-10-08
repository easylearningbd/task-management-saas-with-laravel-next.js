'use client'

import * as React from 'react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/cn'
import { isHexColor } from '@/lib/hex-color'

/* A colour as `#RRGGBB`: a swatch button beside a hex text field, kept in sync both ways.
   - The swatch is a real button (focusable, labelled) that opens the browser's native colour
     picker; picking fills the field with the uppercase hex.
   - Typing a valid hex repaints the swatch; an invalid one leaves the swatch on the last valid
     colour (never a broken one) and the field shows its error through `aria-invalid`.
   - Typed letters become uppercase as you type, so the field always shows what is saved.
   - The swatch button is the Input skin (1px `input` border, `radius-lg`, `card` ground) at the
     field's own height, square; the colour fills it inset by 4px with `radius-sm`.
   Controlled: `value` is whatever the user typed. Pair it with a Label and FieldMessage as
   TextField does for Input. */

export type ColorPickerProps = {
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  /** The hex field's id (for its Label). */
  id?: string
  name?: string
  /** Accessible name of the swatch button, e.g. "Choose a color". */
  swatchLabel: string
  /** Shown while `value` is not a valid colour yet (e.g. an empty field). */
  fallback?: string
  invalid?: boolean
  /** Id of the field's helper / error text. */
  describedBy?: string
  required?: boolean
  disabled?: boolean
  placeholder?: string
  inputRef?: React.Ref<HTMLInputElement>
  className?: string
}

export function ColorPicker({
  value,
  onChange,
  onBlur,
  id,
  name,
  swatchLabel,
  fallback = '#000000',
  invalid = false,
  describedBy,
  required = false,
  disabled = false,
  placeholder,
  inputRef,
  className,
}: ColorPickerProps) {
  const nativeRef = React.useRef<HTMLInputElement>(null)

  // The swatch shows the latest valid colour: the value when it is one, else the last one seen.
  const [lastValid, setLastValid] = React.useState(() => (isHexColor(value) ? value.trim().toUpperCase() : fallback.toUpperCase()))
  const current = isHexColor(value) ? value.trim().toUpperCase() : lastValid
  if (current !== lastValid) setLastValid(current)

  const openPicker = () => {
    const input = nativeRef.current
    if (!input) return
    try {
      input.showPicker()
    } catch {
      input.click() // browsers without showPicker(), or without a user gesture
    }
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <button
        type="button"
        onClick={openPicker}
        disabled={disabled}
        aria-label={`${swatchLabel}: ${current}`}
        className={cn(
          'relative inline-flex size-control shrink-0 items-center justify-center rounded-lg border border-input bg-card p-1 transition-colors',
          'hover:border-muted-foreground focus-visible:border-ring focus-visible:shadow-focus focus-visible:outline-none',
          'disabled:cursor-not-allowed disabled:opacity-disabled',
        )}
      >
        {/* The colour itself is data (the user's choice), not a design token. */}
        <span aria-hidden="true" className="size-full rounded-sm" style={{ backgroundColor: current }} />
        <input
          ref={nativeRef}
          type="color"
          tabIndex={-1}
          aria-hidden="true"
          disabled={disabled}
          value={current.toLowerCase()}
          onChange={(event) => onChange(event.target.value.toUpperCase())}
          // Sits under the swatch so the browser anchors its picker there; never focusable.
          className="pointer-events-none absolute inset-0 size-full opacity-0"
        />
      </button>
      <Input
        ref={inputRef}
        id={id}
        name={name}
        value={value}
        onChange={(event) => onChange(event.target.value.toUpperCase())}
        onBlur={onBlur}
        placeholder={placeholder}
        maxLength={7}
        spellCheck={false}
        autoComplete="off"
        disabled={disabled}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        aria-required={required || undefined}
        className="font-mono"
      />
    </div>
  )
}
