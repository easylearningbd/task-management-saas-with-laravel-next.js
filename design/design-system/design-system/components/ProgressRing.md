# ProgressRing

A ring for a single figure against its own maximum — plan storage, trial days used, quota consumed. Two sizes: 72px with a `progress-ring` stroke, and 96px with a 6px stroke.

Two concentric circles: the `track` ring, then the value ring in `primary` with a round cap, `rotate(-90)` so it starts at twelve o'clock. The figure sits in the middle at 16px/700 (22px on the large size) with an optional 10px `muted-foreground` unit line under it.

```tsx
<svg viewBox="0 0 72 72" className="size-18">
  <circle cx="36" cy="36" r="32" fill="none" stroke="var(--track)" strokeWidth="var(--progress-ring)" />
  <circle cx="36" cy="36" r="32" fill="none" stroke="var(--primary)" strokeWidth="var(--progress-ring)"
    strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - pct)} transform="rotate(-90 36 36)" />
</svg>
```

The ring color carries the reading: `primary` under 75%, `warning` from 75%, `danger` at 90% and above — the one place in the system where a fill changes color to mean something, because the number alone is easy to miss. An indeterminate ring is a 25% arc rotating once per second; everything else never animates.

Use a ring for one figure with a ceiling and a `ProgressBar` for comparing several things. Both need `role="progressbar"` with `aria-valuenow`.

This part is not in the screenshots the system was drawn from; it is built from `ProgressBar`'s tokens.
