# TASK — Super Admin Dashboard

The page from the screenshot, built on the existing TASK design system. No new colors, fonts,
shadows or component variants — everything is a token or an existing component.

```
task-dashboard/
├── app/
│   ├── globals.css                       ← REPLACES the one in the design-system zip (see below)
│   ├── layout.tsx                        ← reference root layout (Inter + font variable)
│   └── (super-admin)/dashboard/page.tsx  ← the page
├── components/
│   ├── shell/   app-shell · sidebar · topbar
│   ├── ui/      primitives (Card, CardHeader, Button, Badge, Avatar)
│   └── dashboard/  hero-banner · stat-cards · lists · charts
├── lib/         cn · dashboard-data
└── preview/index.html                    ← open this, no build needed
```

## Drop it in

Copy `app/`, `components/` and `lib/` into your Next.js 16 project. Imports use the `@/` alias,
so `tsconfig.json` needs the default Next mapping:

```json
{ "compilerOptions": { "paths": { "@/*": ["./*"] } } }
```

`lucide-react` is the only runtime dependency. The charts are hand-built SVG/CSS — no chart
library to install.

`preview/index.html` opens in a browser with no server: the same components, compiled, with
Inter bundled locally.

## globals.css supersedes the design-system copy

One token changed, and it was a measurement error in the original extraction, not a new
decision:

```diff
- --text-title-page: 24px;  --text-title-page--line-height: 32px;
+ --text-title-page: 20px;  --text-title-page--line-height: 28px;
```

The screenshots put "Dashboard" at 100.5px wide for nine characters, which is Inter 700 at
**20px** (at 24px it measures 122px). The 24px figure came from the Companies capture, where the
title had a text selection behind it that inflated the measurement. Use this `globals.css`
everywhere; the rest of the file is byte-identical to the design-system zip.

## Page states

- **Default** — as captured, with the August bar hovered and its tooltip open.
- **Bar chart hover** — moving across the chart moves the cursor band and tooltip; leaving it
  returns to August so the page always matches the capture at rest.
- **Dark mode** — the moon button in the top bar toggles `.dark` on `<html>`. Every token has a
  dark value; no `dark:` variants anywhere.
- **Sidebar (mobile)** — below `lg` the sidebar slides off-canvas; the panel button in the top
  bar opens it over a scrim.
- **Year selects** — both chart cards have working `2026 / 2025 / 2024` selects (data is static).

Verified: no horizontal overflow at 390, 768, 1280 or 1999px.

## Built from tokens, because the design system has no component for it

Listed so you can decide whether any deserve to become real components:

| Thing | Built from |
| --- | --- |
| Top bar | `h-topbar`, `bg-card`, `border-border` + ghost buttons |
| Page header | `text-title-page` + `text-caption` |
| Dashboard container | `rounded-xl border border-border p-card` |
| Bar chart | `chart-1` at 70 / 50 / 30% for bars, axes and gridlines; `chart-cursor` band; `popover` tooltip |
| Area chart | `chart-1` line, `chart-area-from` → `chart-area-to` fill |
| Help button | `size-fab`, `bg-primary`, `shadow-md` |
| Year select | native `<select>` in the `Input` skin at `h-control-sm` |

## What I couldn't match exactly

1. **Avatars** are initials, not photos — the capture uses stock headshots I don't have. Pass
   `src` to `<Avatar>` and the photo takes over; the initials stay as the fallback.
2. **Stat card borders** are `border-stat-<hue>-icon-bg` (the hue's 100 shade). The capture uses
   the hue's 200/300 shade (`#5ee9b5`, `#bedbff`, `#ddd6ff`, `#c6d2ff`, `#fee685`) — one step
   darker. Matching exactly needs five new border tokens, which I didn't add.
3. **Revenue values** are inferred from the curve against the axis; they sum to exactly
   `$93,900.00` and the shape matches, but individual months are estimates. Real numbers go in
   `lib/dashboard-data.ts`. The bar chart's 12 values are read directly and sum to 98.
4. **Top bar height** is `h-topbar` (64px); the capture measures 62px. I kept the token.
5. **The help button glyph** is `LifeBuoy` — the capture's icon is too small to identify.
6. **Page height** lands at 1900px against the capture's 1885px, spread across four section gaps
   (the capture's card shadows read ~3px wider than `shadow-xs` draws them).
