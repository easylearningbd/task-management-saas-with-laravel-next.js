# DateInput

A native `<input type="date">` wearing the `Input` skin, with a `Calendar` glyph in `muted-foreground`. Two arrangements: the icon leads in a filter bar's range pair, and trails in a form field.

The empty state shows the browser's own `mm/dd/yyyy` mask in `muted-foreground` — do not replace it with a placeholder string.

```tsx
<div className="relative">
  <input type="date"
    className="h-control w-full rounded-lg border border-input bg-card px-3 pr-9 text-body
      focus-visible:border-ring focus-visible:shadow-focus focus-visible:outline-none
      [&::-webkit-calendar-picker-indicator]:opacity-0" />
  <Calendar className="pointer-events-none absolute right-3 top-1/2 size-icon -translate-y-1/2
    text-muted-foreground opacity-muted-icon" />
</div>
```

Date *ranges* are two of these side by side, from first then to second, and the second rejects anything before the first. Stored and displayed dates are `YYYY-MM-DD`; only the input mask follows the browser locale.
