# Pagination

A row of `control-height-sm` cells on `radius-lg` with a 1px `border` and `shadow-sm`. The current page is filled `primary` with a `primary-foreground` label; the rest are `card` and take `accent` on hover. `« Previous` and `Next »` keep their guillemets and go `opacity-disabled` at the ends.

It sits in the table card's footer above a 1px rule, with `Showing 1 to 10 of 12 results` on the left in `body-sm` `muted-foreground` and the cells on the right.

```tsx
<nav aria-label="Pagination" className="inline-flex items-center gap-1.5">
  <button className="h-control-sm rounded-lg border border-border bg-card px-2.5 text-button-sm shadow-sm
    hover:bg-accent disabled:opacity-disabled">« Previous</button>
  <button aria-current="page"
    className="h-control-sm min-w-control-sm rounded-lg border border-primary bg-primary px-2.5
      text-button-sm text-primary-foreground">1</button>
</nav>
```

Show up to seven cells; past that, collapse the middle to `…` keeping the first page, the last page and two either side of the current one. The current page carries `aria-current="page"`. Pagination never appears when everything fits on one page — the result count stays.
