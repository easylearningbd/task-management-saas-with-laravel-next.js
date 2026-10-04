# ViewToggle

Two 34×26 icon buttons in a 3px-padded `card` shell with a 1px `border` and `shadow-sm`, sitting at the right end of a filter bar. The active view is filled `primary` with a `primary-foreground` icon; the other is `muted-foreground` and takes `accent` on hover.

```tsx
<div className="inline-flex items-center gap-0.5 rounded-lg border border-border bg-card p-[3px] shadow-sm">
  <button aria-pressed={view === 'list'}
    className="inline-flex h-6.5 w-8.5 items-center justify-center rounded-md text-muted-foreground
      aria-pressed:bg-primary aria-pressed:text-primary-foreground hover:bg-accent">
    <List className="size-icon" />
  </button>
</div>
```

Exactly two options, `List` and `LayoutGrid`, and the choice persists per table. Each button needs an `aria-label` and `aria-pressed`.

The same part at 44px with text labels is the **SegmentedControl** used for Monthly / Yearly pricing: a `muted` track on `radius-tile` with 4px padding, the active pill on `card` with `shadow-sm`, and the `Save 20%` `success-solid` pill riding inside the inactive label. Use that form when the labels are words and the choice reshapes the content; use the icon form when it only changes the layout.
