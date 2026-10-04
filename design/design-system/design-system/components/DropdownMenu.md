# DropdownMenu

A `popover` panel on `radius-lg` with a 1px `border`, `shadow-lg` and 4px padding, anchored 4px below its trigger and aligned to the trigger's edge.

Items are 34px on `radius-md` with a 16px leading icon 10px from the label, taking an `accent` ground when highlighted. An optional `caption`-cased section label sits above a group in `muted-foreground`; groups are divided by a 1px `border` rule that bleeds to the panel's edges. A destructive item is `danger` text on a `danger-soft` highlight and always sits last, under a rule.

```tsx
<DropdownMenuContent align="end" sideOffset={4}
  className="w-58 rounded-lg border-border bg-popover p-1 shadow-lg">
  <DropdownMenuLabel className="px-2 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider
    text-muted-foreground">Company</DropdownMenuLabel>
  <DropdownMenuItem className="h-8.5 gap-2.5 rounded-md px-2 text-body focus:bg-accent">
    <ArrowUpRight className="size-icon" /> Open dashboard
  </DropdownMenuItem>
  <DropdownMenuSeparator className="-mx-1 bg-border" />
  <DropdownMenuItem className="h-8.5 gap-2.5 rounded-md px-2 text-body text-danger focus:bg-danger-soft">
    <Trash2 className="size-icon" /> Delete company
  </DropdownMenuItem>
</DropdownMenuContent>
```

You provide the items, their icons and handlers. Every item names its object — `Delete company`, not `Delete`. Keep a menu under about eight items and never nest submenus. This is where table row actions go once there are more than six of them; below that they stay as inline `ButtonGhost` icons.
