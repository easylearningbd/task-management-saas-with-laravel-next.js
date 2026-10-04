# TASK — UI rules

Multi-tenant task & project management SaaS. Two dashboards, Super Admin and Company, sharing
one design system. Stack: **Next.js 16 · Tailwind CSS v4 · shadcn/ui · lucide-react**.

## Before writing UI

1. The theme is `app/globals.css` (copied from `globals.css` in this folder). It is the **only**
   custom CSS in the project. Do not add stylesheets, CSS modules or `<style>` blocks.
2. Build with Tailwind utilities bound to the tokens below — `bg-card`, `text-muted-foreground`,
   `border-border`. **Never write a hex value, a `bg-emerald-500`, a `text-gray-500` or an
   arbitrary `bg-[#10b77f]` in a component.** If a color seems missing, it is in the token list.
3. Before building a part that already exists, read its file in
   `design-system/components/<Name>.md` — each one carries the exact markup, its states and its
   rules. `design-system/components/README.md` indexes all 28.
4. `design-system/brand-book.md` has voice, layout and the reasoning. Read it once.

## Tokens

Colors (each has a light and a dark value; `.dark` on `<html>` switches them):

- **Surfaces** `background` `foreground` `card` `card-foreground` `popover` `popover-foreground`
  `muted` `muted-foreground` `muted-foreground-alt` `accent` `accent-foreground` `secondary`
  `secondary-foreground` `border` `input` `ring` `table-header` `overlay` `track`
- **Brand** `primary` `primary-foreground` `primary-hover` `primary-active` `primary-soft`
  `primary-strong`
- **Status** `success` `success-soft` `success-solid` `info` `info-soft` `warning` `warning-soft`
  `danger` `danger-soft` `neutral` `neutral-soft` `destructive` `destructive-foreground`
- **Stat cards** `stat-{emerald,blue,violet,indigo,amber}` plus `-icon-bg` `-icon` `-label` `-value`
- **Charts** `chart-1`…`chart-5` `chart-grid` `chart-cursor` `chart-area-from` `chart-area-to`
- **Sidebar** `sidebar` `sidebar-foreground` `sidebar-primary` `sidebar-primary-foreground`
  `sidebar-accent` `sidebar-accent-foreground` `sidebar-border` `sidebar-muted` `sidebar-ring`
- **Hero** `hero` `hero-foreground` `hero-muted` `hero-accent` `hero-chip` `hero-chip-border`
  `hero-glow-teal` `hero-glow-slate`
- **Misc** `code` `code-foreground` `avatar-ring`

Type — use the named scale, not `text-sm`/`text-2xl`, so weight and line-height come along:
`text-display-lg` `text-display` `text-title-page` `text-title-section` `text-title-card`
`text-title-row` `text-body` `text-body-sm` `text-label` `text-table-head` `text-button`
`text-button-sm` `text-caption` `text-badge` `text-money` `text-code`

Layout — `w-sidebar` (280) `h-topbar` (64) `h-control-sm` (32) `h-control` (36) `h-control-lg` (40)
`h-thead` (44) `h-row` (60) `p-card` (24) `size-icon` (16) `size-icon-lg` (20) `size-tile` (40)
`size-avatar` (36) `size-fab` (56)

Radius — `rounded-md` (6) badges · `rounded-lg` (8) buttons, inputs, selects, icon buttons ·
`rounded-tile` (10) stat tiles, segmented track · `rounded-xl` (12) cards, modals, hero ·
`rounded-full` avatars, switches, radios

Elevation — `shadow-xs` resting cards · `shadow-sm` buttons · `shadow-lg` dropdowns, toasts ·
`shadow-xl` modals · `shadow-focus` the focus halo. Nothing else casts a shadow.

## Hard rules

- **One `primary` button per view.** Everything else is outline or ghost. Green as *text* on a
  light ground is `primary-strong`, never `primary` (2.6:1).
- **Three control heights only:** `h-control-sm` toolbar, `h-control` default, `h-control-lg`
  filter-bar search. No others.
- **Status = a soft ground plus its text color, always paired.** `success` Active/Paid/Approved ·
  `info` Completed/Signed/Sent, plan names, trials, Default · `warning` Pending/Partial ·
  `danger` Rejected/Cancelled/Urgent/Overdue · `neutral` Draft/Inactive. Plan names are always
  `info` — a plan is a classification, not a status.
- **Every interactive element gets four states:** hover (fills → `primary-hover`, everything else
  → `accent`), focus (`focus-visible:border-ring focus-visible:shadow-focus`, never
  `outline-none` alone), active (`primary-active`), disabled (`opacity-disabled` +
  `cursor-not-allowed`). Transitions are 150ms, color only. Nothing scales or lifts.
- **Dark mode is free** — write `bg-card`, never `dark:bg-slate-800`. If a component needs a
  `dark:` prefix, a token is missing.
- **Money is `text-money`** (mono, 2 decimals, currency symbol). Dates are `YYYY-MM-DD` in
  `muted-foreground-alt`. Empty cells read `-`. Never smaller than 12px anywhere.
- **Icons are lucide**, `size-icon` in controls and `size-icon-lg` in sidebar items and stat
  tiles, inheriting `currentColor`. Icon-only buttons need an `aria-label`.
- Tables: `h-thead` header on `table-header`, `h-row` rows separated by a 1px top border, hover
  `accent`, selected `primary-soft`. No zebra striping, no vertical rules.

## Don't

Second accent color · gradient buttons · colored left-border cards · tinted card grounds ·
emerald for anything but the brand's own affordances · a control height outside the three ·
a shadow on a table row or the sidebar · `dark:` variants · raw hex anywhere in a component.
