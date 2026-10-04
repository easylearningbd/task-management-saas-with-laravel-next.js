# EmptyState

What a card shows instead of a table when there is nothing to show. Centred in the card with `space-12` of vertical air: a 56px `radius-full` `muted` circle holding a 26px `muted-foreground` glyph, a `title-card` line, a `body` `muted-foreground` sentence capped at about 340px, and one action.

```tsx
<div className="rounded-xl border border-border bg-card px-card py-12 text-center">
  <span className="inline-flex size-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
    <Inbox className="size-6.5" />
  </span>
  <h3 className="mt-4 text-title-card">No companies yet</h3>
  <p className="mx-auto mt-1.5 max-w-85 text-body text-muted-foreground">…</p>
  <button className="mt-4.5 …primary">Add Company</button>
</div>
```

Three flavours, and they are not interchangeable:

- **Nothing yet** — the `Inbox` glyph, an inviting line, and the page's primary action.
- **Nothing matched** — the `Search` glyph, "No companies match your filters", and an outline `Clear filters` button. Never offer to create a record here.
- **Couldn't load** — the `CircleAlert` glyph in `danger` on `danger-soft`, the reason, and an outline `Try again`.

The heading states the fact, the sentence says what fills the space. Never leave the table header standing above an empty body — replace the whole thing.
