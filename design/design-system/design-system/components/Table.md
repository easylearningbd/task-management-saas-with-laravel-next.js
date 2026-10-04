# Table

The workhorse of both dashboards. The table lives in a `Card` with no body padding so rows run edge to edge, and the card's `radius-xl` clips the first and last row.

The header row is `table-header-height` tall on a `table-header` ground with `table-head` labels in `muted-foreground`; sortable columns carry a trailing double-chevron at 70% opacity. Body rows are `table-row-height` with a 1px `border` top rule — no rule above the first row, no zebra striping, no vertical rules.

```tsx
<div className="overflow-hidden rounded-xl border border-border bg-card">
  <table className="w-full text-body">
    <thead>
      <tr className="h-thead bg-table-header">
        <th className="px-4 text-left text-table-head font-medium text-muted-foreground">Name</th>
      </tr>
    </thead>
    <tbody>
      <tr className="h-row transition-colors hover:bg-accent data-[selected=true]:bg-primary-soft">
        <td className="border-t border-border px-4">…</td>
      </tr>
    </tbody>
  </table>
</div>
```

Column order is fixed: a `#` index in `muted-foreground`, the identity cell (avatar plus `title-row` name over a `body-sm` email), classification badges, the status badge, a date in `muted-foreground-alt` behind a `Calendar` glyph, then right-aligned actions. Empty cells read `-`.

You provide the rows, the sort state and the action handlers. Rows take `accent` on hover and `primary-soft` when selected; a row is clickable only if the whole row opens a detail view, and then the actions cell must stop propagation. Below about 640px the table becomes a list of cards — the same fields stacked — rather than scrolling sideways.
