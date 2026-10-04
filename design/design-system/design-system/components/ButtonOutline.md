# ButtonOutline

The default button for everything that is not the page's one emerald action: `Cancel`, `Back`, `Filters`, `Refresh`, and every toolbar control.

`card` ground, 1px `border`, `foreground` label, `radius-lg`, `shadow-sm`. Same three heights as `ButtonPrimary`; toolbars use `control-height-sm` with a `button-sm` label.

```tsx
<button className="inline-flex h-control-sm items-center justify-center gap-1.5 rounded-lg border border-border
  bg-card px-3 text-button-sm shadow-sm transition-colors
  hover:bg-accent focus-visible:border-ring focus-visible:shadow-focus focus-visible:outline-none
  disabled:cursor-not-allowed disabled:opacity-disabled">
  <Filter className="size-3.5" /> Filters
</button>
```

States: `accent` ground on hover with the border unchanged, `ring` border plus `shadow-focus` on focus, `opacity-disabled` when disabled.

You provide the label and optional icons on either side. In a dialog footer, `Cancel` is an outline button and sits left of the primary one. Never give an outline button a colored border to signal meaning — that job belongs to a badge.
