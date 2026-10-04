# Select

A shadcn `Select` shaped exactly like `Input` — same height, border, radius and padding — with a trailing `ChevronDown` in `muted-foreground`.

The list is a `popover` panel 4px below the trigger with `radius-lg`, 1px `border` and `shadow-lg`, padded 4px. Options are 32px tall on `radius-md`, take an `accent` ground when highlighted, and the selected one is `primary-strong` at 500 with a trailing `Check`.

```tsx
<Select>
  <SelectTrigger className="h-control w-full rounded-lg border border-input bg-card px-3 text-body
    data-[placeholder]:text-muted-foreground
    focus:border-ring focus:shadow-focus focus:outline-none">
    <SelectValue placeholder="Select Discount Type" />
  </SelectTrigger>
  <SelectContent className="rounded-lg border-border bg-popover p-1 shadow-lg">
    <SelectItem value="percentage" className="h-8 rounded-md px-2 text-body focus:bg-accent">Percentage</SelectItem>
  </SelectContent>
</Select>
```

You provide the options and the empty-state label. A filter select shows its own default rather than a placeholder — `All Status`, `All Types` — because "no selection" is itself a meaningful filter. Past about ten options, add a search field to the list.
