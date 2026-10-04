# SidebarNav

The fixed `sidebar-width` column both dashboards navigate from: a `sidebar` ground with a 1px `sidebar-border` right edge, full height, never scrolled away.

Top to bottom: the wordmark in a `topbar-height` row — `TASK` at 26px/700 with the `T` in `sidebar-primary`; a `Search menu...` field; then groups, each opened by a 12px/600 `sidebar-muted` section header (`Overview`, `Management`, `System Control`).

Items are 40px on `radius-lg` with a 12px inset, a 20px lucide glyph and a 14px/500 label. The active item turns `sidebar-primary` — icon and label together, with no fill behind it. Hover gives any item a `sidebar-accent` ground.

A parent with children carries a trailing chevron and expands in place. Sub-items are 34px, indented behind a 1px `sidebar-border` rail, and the active one shows a `border-width-2` `sidebar-primary` bar on that rail plus `sidebar-primary` text. A count rides at the far right as a `warning` badge when something needs attention.

```tsx
<a href="/companies" aria-current="page"
  className="mx-3 flex h-10 items-center gap-3 rounded-lg px-3 text-body font-medium
    text-sidebar-foreground hover:bg-sidebar-accent aria-[current=page]:text-sidebar-primary">
  <Building2 className="size-icon-lg" /> Companies
</a>
```

You provide the item tree, the icons and the active path. Exactly one item is active at a time, and a sub-item being active also tints its parent. Two levels only — anything deeper belongs in `Tabs` on the page itself. `sidebar-primary` on `sidebar` is 2.6:1, which is why the active state never relies on color alone: it also carries `aria-current`, the 500 weight and, for sub-items, the indicator bar.
