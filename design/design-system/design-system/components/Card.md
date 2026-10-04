# Card

The white panel every page is built from: a 1px `border` hairline, `radius-xl` corners and `shadow-xs` — the border does the separating, not the shadow.

Anatomy: an optional header (`title-card` plus a `body-sm` subtitle in `muted-foreground`, with an optional right-aligned link), a body padded `card-padding`, and an optional footer separated by a 1px rule. A card that holds a table drops the body padding so rows run edge to edge; a card that holds a filter bar uses `space-4` instead of `card-padding`.

```tsx
<div className="rounded-xl border border-border bg-card shadow-xs">
  <div className="flex items-start justify-between gap-4 p-card pb-0">
    <div>
      <h2 className="text-title-card">Recently Registered Companies</h2>
      <p className="mt-0.5 text-body-sm text-muted-foreground">Latest companies that joined the platform</p>
    </div>
    <a className="inline-flex items-center gap-1 text-body-sm font-medium text-primary-strong" href="#">
      View all <ChevronRight className="size-3.5" />
    </a>
  </div>
  <div className="p-card">{children}</div>
</div>
```

You provide the header content and the body. Cards never nest inside cards — use a rule or a heading to divide a card instead. Never tint a card ground to group things; use space.
