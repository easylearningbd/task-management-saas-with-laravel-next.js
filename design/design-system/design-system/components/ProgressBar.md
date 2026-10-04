# ProgressBar

A `progress-height` track on `radius-sm` in `track`, filled `primary` from the left. Used to compare things within one list — revenue per plan, storage used against a quota.

The bar rarely stands alone: a 14px/500 name sits above left, its `money` figure above right, and an optional `caption` sits under the bar. In Top Plans each row also leads with a 28px `primary-soft` rank circle carrying its number in `primary-strong`.

```tsx
<div>
  <div className="mb-2 flex items-baseline justify-between gap-3">
    <span className="text-body font-medium">Pro</span>
    <span className="text-money">$199.96</span>
  </div>
  <div className="h-1.5 overflow-hidden rounded-sm bg-track">
    <div className="h-full rounded-sm bg-primary" style={{ width: `${pct}%` }} role="progressbar"
      aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} />
  </div>
</div>
```

You provide the percentage and the labels. Scale a comparison list against the largest value so the leader reads full, and keep a 0% bar visible as an empty track rather than hiding the row. Fill stays `primary` — switch to `info` or `warning` only when the bar measures consumption against a limit and is nearing it. Never animate a bar that is not actually moving.
