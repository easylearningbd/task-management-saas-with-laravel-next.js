# Tabs

An underline tab bar for switching a table between subsets of the same records — the status filters on Plan Requests, the sections of a detail page.

A 42px row over a 1px `border` rule. Labels are 14px/500 in `muted-foreground`, going `foreground` on hover and when active; the active tab also gets a 2px `primary` bar sitting on the rule. Counts ride in a 20px `radius-md` chip — `muted` / `muted-foreground` at rest, `primary-soft` / `primary-strong` on the active tab.

```tsx
<TabsList className="flex h-[42px] items-center gap-6 border-b border-border bg-transparent p-0">
  <TabsTrigger value="all" className="relative h-[42px] gap-2 text-body font-medium text-muted-foreground
    data-[state=active]:text-foreground
    data-[state=active]:after:absolute data-[state=active]:after:inset-x-0 data-[state=active]:after:-bottom-px
    data-[state=active]:after:h-0.5 data-[state=active]:after:rounded-sm data-[state=active]:after:bg-primary">
    All <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-md bg-muted px-1.5
      text-[11px] font-medium text-muted-foreground">14</span>
  </TabsTrigger>
</TabsList>
```

Counts come from the server and are always shown, including `0` — a zero-count tab is disabled, not hidden, so the set of tabs never shifts. Tabs change what a table shows; they never navigate to another page. Use `SegmentedControl` instead when the choice changes how the same data is *priced or presented*, like Monthly / Yearly.

This bar is not in the screenshots the system was drawn from; it is built from the same parts so filtered tables have a consistent control.
