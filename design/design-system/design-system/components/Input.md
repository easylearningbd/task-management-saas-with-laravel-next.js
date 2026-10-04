# Input

The 36px text field every form is built from: `card` ground, 1px `input` border, `radius-lg`, 12px side padding, `body` text with a `muted-foreground` placeholder.

A field is a stack of three things `space-1.5` apart — a `label` with a `destructive` asterisk when required, the control, and optional `caption` helper text in `muted-foreground` that turns `danger` when the field is in error.

```tsx
<div className="flex flex-col gap-1.5">
  <label className="text-label" htmlFor="name">Company Name<span className="ml-0.5 text-destructive">*</span></label>
  <input id="name" placeholder="enter company name"
    className="h-control rounded-lg border border-input bg-card px-3 text-body
      placeholder:text-muted-foreground transition-colors
      hover:border-muted-foreground
      focus-visible:border-ring focus-visible:shadow-focus focus-visible:outline-none
      aria-[invalid=true]:border-destructive aria-[invalid=true]:focus-visible:shadow-focus-danger
      disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-disabled" />
  <p className="text-caption text-muted-foreground">Charged per company, per month.</p>
</div>
```

Placeholders are lowercase hints ("enter company name"), never a restatement of the label. A unit or affix sits right-aligned inside the control in `muted-foreground`. Error text replaces the helper line rather than being added below it, and `aria-invalid` carries the state so the red border is never the only signal.
