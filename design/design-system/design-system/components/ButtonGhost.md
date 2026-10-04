# ButtonGhost

A borderless button, used almost entirely as the `control-height-sm` square icon button in table row actions, card headers and the breadcrumb bar.

No ground and no border at rest; the icon is `icon-size` in `muted-foreground`. On hover it takes an `accent` ground and the icon goes to `foreground`. The delete action is the one exception: it goes to `danger` on `danger-soft`.

```tsx
<button className="inline-flex size-control-sm items-center justify-center rounded-lg text-muted-foreground
  transition-colors hover:bg-accent hover:text-foreground
  focus-visible:border focus-visible:border-ring focus-visible:shadow-focus focus-visible:outline-none
  disabled:cursor-not-allowed disabled:opacity-disabled">
  <SquarePen className="size-icon" />
</button>
```

You provide the icon and an `aria-label` — an icon button without one is unusable on a screen reader. Row actions run right-aligned in a fixed order: open, details, billing, credentials, edit, delete, with delete always last. Six is the ceiling; past that, move them into a `DropdownMenu`.
