# Badge

A 24px pill on `radius-md` with 10px side padding and `badge` text — soft ground, colored text, never a solid fill and never a border.

Five status pairs cover the whole product, and the ground always travels with its text color:

| Variant | Ground · text | Words |
| --- | --- | --- |
| success | `success-soft` · `success` | Active, Paid, Approved |
| info | `info-soft` · `info` | Completed, Signed, Sent, plan names, Default, trial pills |
| warning | `warning-soft` · `warning` | Pending, Partial, Action needed |
| danger | `danger-soft` · `danger` | Rejected, Cancelled, Urgent, Overdue |
| neutral | `neutral-soft` · `neutral` | Draft, Inactive |

```tsx
<span className="inline-flex h-6 items-center gap-1 rounded-md bg-success-soft px-2.5 text-badge text-success">
  Active
</span>
```

Two specials: the `Save 20%` pill is the only solid badge in the product (`success-solid`, white text), and a coupon code is a 28px `code` chip in `font-mono` at `code` size. Money is `money` — mono, not a badge.

A badge states a fact; it is never clickable and never carries an icon except the `Zap` on a trial pill and the `CircleAlert` on `Action needed`. Plan names are always `info`, whatever the plan — the plan is a classification, not a status.
