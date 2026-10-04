# SearchInput

An `Input` at `control-height-lg` with a leading `Search` glyph, used once per list page as the first control in the filter bar.

The icon is `icon-size` in `muted-foreground` at `opacity-muted-icon`, 8px from the text. Once there is a query, a `X` clear button appears right-aligned inside the field. Placeholder is always `Search...` — the filter bar's position already says what is being searched.

```tsx
<div className="relative">
  <Search className="pointer-events-none absolute left-3 top-1/2 size-icon -translate-y-1/2 text-muted-foreground opacity-muted-icon" />
  <input type="search" placeholder="Search..."
    className="h-control-lg w-full rounded-lg border border-input bg-card pl-10 pr-9 text-body
      placeholder:text-muted-foreground
      focus-visible:border-ring focus-visible:shadow-focus focus-visible:outline-none" />
</div>
```

You provide the query state and debounce — 300ms is what the tables assume. Searching filters the current table in place and resets pagination to page 1; it never navigates.
