# TASK — Company Dashboard (`user_dashboard`)

The Company-side dashboard from the screenshot, built on the existing TASK design system.
No new colors, fonts, shadows or component variants.

```
user_dashboard/
├── app/
│   ├── globals.css                     ← same file as the Super Admin page package
│   ├── layout.tsx                      ← reference root layout
│   └── (company)/dashboard/page.tsx    ← the page
├── components/
│   ├── shell/   app-shell · sidebar · topbar   ← UPDATED, backwards-compatible (see below)
│   ├── ui/      primitives
│   ├── company/ hero-and-stats · panels · shell-config
│   └── charts/  charts (generic AreaChartCard + BarChartCard)
├── lib/         cn · company-data
└── preview/index.html                  ← open this, no build needed
```

Copy `app/`, `components/` and `lib/` into the Next.js project. Imports use the `@/` alias.
`lucide-react` is the only runtime dependency; the charts are hand-built SVG/CSS.

## The shell gained optional props — nothing existing changed

The Super Admin page and its shell keep working untouched. Three components took **optional**
props so one shell serves both dashboards:

| Component | New optional prop | Default |
| --- | --- | --- |
| `Sidebar` | `sections`, `footer` | the Super Admin nav tree, no footer |
| `Topbar` | `user`, `actions` | Super Admin user, no extra actions |
| `AppShell` | `sections`, `sidebarFooter`, `user`, `topbarActions` | passed through |

The Company values live in `components/company/shell-config.tsx`: the nav tree, the
`Company / Pro` plan card pinned under **System Configuration**, and the **Start** button in the
top bar.

`components/charts/charts.tsx` is a generic version of the two charts. The Super Admin page still
uses its own copy — switching it over is a one-line import change I did **not** make.

## Page and states

- **Default** — as captured.
- **Timesheet bar hover** — cursor band plus a tooltip; no bar is hovered at rest, matching the
  capture.
- **Dark mode** — the moon button toggles `.dark`. Every token has a dark value; no `dark:`
  variants.
- **Sidebar (mobile)** — slides off-canvas below `lg`, opened by the panel button.
- **Selects** — the project picker in Project Progress and both chart year pickers are live.

Verified: no horizontal overflow at 390 / 768 / 1280 / 1999px. Page height 2530px against the
capture's 2495px; hero, stat row and the chart cards land within 1–3px.

## Built from tokens, because the design system has no component for it

| Thing | Built from |
| --- | --- |
| Card head with a rule | `border-b border-border px-card py-4.5` |
| Performance rows | `stat-<hue>-icon-bg` track + `stat-<hue>-icon` fill and label |
| Progress donut | two SVG circles, `track` + `primary`, 17px stroke |
| Budget / Spent / Remaining boxes | `rounded-lg border border-border` |
| Empty state | `size-14` `bg-muted` circle + `CircleAlert` |
| Sidebar plan card | `bg-accent` + an outline `Upgrade` button |
| Start button | outline button with a `primary`-filled `Play` glyph |

## What I guessed or couldn't match exactly

1. **Badge palette.** This page uses statuses the design system's five-tone map doesn't cover, so
   I mapped them to the nearest existing tokens and they are a shade off:
   - `Completed` — capture `#faf5ff / #8200db` (purple), built with `stat-violet / stat-violet-label` (`#f5f3ff / #7008e7`)
   - `Done` — capture `#f0faf7 / #10b77f`, built with `primary-soft / primary`
   - `Cancelled` — capture `#f6f6f7 / #6b7280`, built with `neutral-soft / neutral`
   - `High` — capture orange `#fff7ed`, built with `stat-amber / stat-amber-icon`
   
   All badges on this page also carry a 1px border in their own tone, which the design system's
   `Badge` doesn't ship — added with a `border border-<tone>/20` className rather than a new variant.
2. **Revenue values** are inferred from the curve against the axis; they sum to exactly
   `$22,500.00` and the shape matches, but individual months are estimates. The 12 timesheet
   values are read directly from the bar labels and sum to 750.
3. **Avatars** are initials (`CO`); the capture uses a photo. Pass `src` to `<Avatar>`.
4. **The longest contract title truncates** by a few characters. The capture fits it because its
   amounts render in the sans face at ~13px; this build uses `text-money` (14px mono) as the
   design system and your brief both require, which costs ~14px of title width.
5. **Sidebar icons** for Projects / Time Tracker / Timesheets are `PanelsTopLeft`,
   `CalendarClock`, `CalendarDays` — closest lucide matches; the capture's glyphs are small.
6. **Page height** is 2530 vs 2495, mostly in the Project Progress card and the four section gaps
   (the capture's card shadows read ~3px wider than `shadow-xs` draws them).
