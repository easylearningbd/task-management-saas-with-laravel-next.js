# RowsPerPage

The page-size control in a table footer: a `body-sm` `muted-foreground` label followed by a compact `control-height-sm` select carrying the current value at 13px/500.

Options are fixed at 10, 25, 50, 100 and the menu is a small `popover` panel with the current value in `primary-strong` and a trailing `Check`.

```tsx
<div className="inline-flex items-center gap-2 text-body-sm text-muted-foreground">
  <span>Rows per page:</span>
  <Select value={String(size)} onValueChange={…}>
    <SelectTrigger className="h-control-sm gap-2 rounded-lg border border-input bg-card px-2.5
      text-button-sm font-medium text-foreground shadow-sm">
      <SelectValue />
    </SelectTrigger>
  </Select>
</div>
```

Changing the size keeps the first visible record in view rather than jumping to page 1, and the choice persists per table for the session.

One copy fix to carry into the build: the current UI reads **"Raws per page"**. The correct label is "Rows per page".
