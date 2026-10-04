TASK is a multi-tenant task and project management SaaS for small businesses. One system dresses both dashboards — Super Admin and Company — so a screen from either reads as the same product. Build every page with Tailwind CSS v4 utilities bound to these tokens; the only custom CSS in the app is the `@theme` block in the Tailwind theme section below.

## Voice and copy

Write plain, operational English. Sentence case everywhere except button labels and navigation, which take Title Case.

- Page title is the noun, plural: `Companies`, `Coupons`, `Plan Requests`. The subtitle under it is one sentence ending in a period: "Manage your companies and their settings."
- Buttons name the action and its object: `Add Company`, `Create Plan`, `Save`, `Cancel`. Never "Submit", never "OK".
- Field labels are Title Case with no colon: `Company Name`, `Discount Value`, `Usage Limit Per User`. Mark required fields with a `destructive` asterisk after the label.
- Placeholders are lowercase instructions — "enter company name", "Leave empty for unlimited" — and never repeat the label as a sentence.
- Helper text sits under the field in `caption`/`muted-foreground`: "If left empty, yearly price will be calculated as 80% of monthly price × 12."
- Destructive or irreversible settings get one `warning` line under the control, not a modal: "Setting this as default will remove default status from the current default plan."
- Table empty rows read `-`, never "N/A" or a blank cell.
- Counts stay with their noun: "Showing 1 to 7 of 7 results", "7 registered companies", "4 subscribers".
- No emoji in the product. The single exception already in the UI is the waving hand after the greeting name on the dashboard hero.

## Color

`background` is the app canvas — a faintly blue-tinted white, not gray. Every panel is a `card` on top of it with a 1px `border` and almost no shadow: the hairline does the work, `shadow-xs` only keeps the card from floating. Do not tint card grounds to separate them; separate them with space.

`primary` (`#10b77f`) is the only brand color and it is spent sparingly: the solid action button on a page, the on-state of switches and radios, the active sidebar item, the active pagination cell, progress fill, the logo `T`. Two or more emerald buttons in one view means one of them should be `outline`.

White on `primary` measures 2.6:1. That is the product's own pairing and it stays exact on filled buttons and pills, where the shape and the 14px/500 label carry it. Wherever green becomes *text* on a light ground — a link, an inline figure, a status word — use `primary-strong` (5.4:1) instead.

`primary-soft` is the 10% tint used for rank circles and quiet emerald chips. `accent` is the hover ground for anything row-shaped: table rows, menu items, sidebar items, ghost buttons.

Status color is never decoration. Each status has a text color and a soft ground, and the two always travel together:

| Meaning | Token pair | Words it carries |
| --- | --- | --- |
| Positive, live, settled | `success` on `success-soft` | Active, Paid, Approved, Completed payment |
| Informational, classifying | `info` on `info-soft` | Completed, Signed, Sent, plan names, trial pills, Default |
| Waiting on someone | `warning` on `warning-soft` | Pending, Partial, Action needed |
| Failed, refused, late | `danger` on `danger-soft` | Rejected, Cancelled, Urgent, Overdue |
| Not started, switched off | `neutral` on `neutral-soft` | Draft, Inactive |

Success and danger are told apart by more than hue — each badge carries its word, and their lightness differs enough to survive a grayscale print. `destructive` is a separate job from `danger`: it marks required fields and the delete icon, and only fills a button inside a confirm-delete dialog.

The five stat-card hues (`stat-emerald`, `stat-blue`, `stat-violet`, `stat-indigo`, `stat-amber`) are a fixed set in a fixed order and mean nothing on their own; they exist so a row of metrics reads as five things rather than one. Use them only on stat cards. Chart series take `chart-1` … `chart-5` in that order, with bars painted at `opacity-chart-fill`.

## Type

One family, `font-sans`, Inter-like. Money and machine strings take `font-mono` so decimal points and codes line up: `money` for every currency figure in a table or detail row, `code` for coupon codes inside a `code` chip.

Set page titles in `title-page`, the line under them in `body` + `muted-foreground`. Card titles are `title-card` with a `body-sm` subtitle. Table headers are `table-head` in `muted-foreground`; the first line of a row is `title-row` and the address or secondary line under it is `body-sm` in `muted-foreground`. Badges and stat labels are `badge`/`caption` at 12px/500 — never smaller than 12px anywhere in the product.

Only three things in the app are larger than 24px: the hero greeting name (`display`), the centred `Subscription Plans` heading (`display`), and a plan price (`display-lg`). Everything else tops out at `title-page`.

## Space and layout

The grid is 4px. The sidebar is `sidebar-width` and fixed; the breadcrumb bar is `topbar-height` with a 1px bottom border; the page body is padded `card-padding` on every side and stacks its sections `space-6` apart.

Controls come in three heights and nothing else: `control-height-sm` for toolbar buttons, pagination cells and view toggles; `control-height` for inputs, selects, date fields and the default button; `control-height-lg` for a search field inside a filter bar. Tables are exact: `table-header-height` for the header row, `table-row-height` for a body row — tall enough for a 36px `avatar-size` plus two lines of text.

Card padding is `card-padding`; the filter bar is the one exception at `space-4`. Icons are `icon-size` in controls and `icon-size-lg` in sidebar items and stat tiles.

## Shape, line and elevation

`radius-lg` is the product's default corner: buttons, inputs, selects, textareas, icon buttons, pagination cells. `radius-xl` is for anything card-shaped — cards, stat cards, plan cards, the modal, the hero banner. `radius-md` is for badges and code chips, `radius-tile` for the 40px stat icon square and the segmented-control track, `radius-full` for avatars, switches, radios and the help button.

Borders are always `border-width` and always `border`. `input` is the same hairline on controls; it measures 1.3:1 on `card`, which is the product's own choice — if a build has to clear the 3:1 non-text floor, change `input` alone to `#8f8f8f` and leave the rest of the system untouched.

Elevation is deliberately weak. `shadow-xs` on resting cards, `shadow-sm` on buttons and the white pill inside a segmented control, `shadow-lg` on dropdowns, selects, tooltips and toasts, `shadow-xl` on modals over an `overlay` scrim. Nothing else casts a shadow — not table rows, not the sidebar, not the hero.

## States

Every interactive element answers to all four:

- **Hover** — fills go one step darker (`primary-hover`), outline and ghost controls take an `accent` ground, table rows take `accent`, icon actions go from `muted-foreground` to `foreground`.
- **Focus** — a 1px `ring` border with `shadow-focus` outside it, and nothing else moves. Keyboard focus is never removed; a field in error swaps to `shadow-focus-danger`.
- **Active** — `primary-active` on a filled button; no transforms, no scale.
- **Disabled** — `opacity-disabled` and `cursor-not-allowed`, keeping the element's own color. Never gray a disabled button into a new color.

Transitions are 150ms on color only.

## Iconography

Lucide at its default 2px stroke on a 24px viewBox: `icon-size` inside controls and table actions, `icon-size-lg` in sidebar items and stat tiles. Icons inherit `currentColor` — never hard-code a hex on an icon. The icons already in use: `LayoutGrid` Dashboard, `Building2` Companies, `Image` Media Library, `CreditCard` Plans, `Tag` Coupons, `DollarSign` Currency, `Gift` Referral Program, `Compass` Landing Page, `Mail` Email Templates, `Settings` Settings, `Search` search fields, `Filter` Filters, `List`/`LayoutGrid` view toggle, `Calendar` dates, `ChevronDown` selects, `ChevronRight` breadcrumb and expanders, `Eye` view, `SquarePen` edit, `Trash2` delete, `KeyRound` credentials, `Lock` access, `ArrowUpRight` open, `Info` details, `History` activity, `Check`/`X` approve and reject, `Plus` add, `RefreshCw` refresh, `Moon` theme toggle, `Globe` language.

## Data display

Money is `money` in `foreground`, always two decimals and always with the currency symbol. Dates are `YYYY-MM-DD` in `muted-foreground-alt` behind a `Calendar` icon. Unlimited is the word "Unlimited", not `∞` or `-`. A table's actions live in a right-aligned cell of `icon-size` ghost buttons in `muted-foreground`, lighting to `foreground` on hover and to `danger` for delete.

Charts sit on `card` with `chart-grid` dashed horizontal gridlines, no vertical lines, no chart border, and no legend when a single series is labelled by its card title. Bars are `chart-1` at `opacity-chart-fill`; the hovered bar sits on a `chart-cursor` band. The revenue line is `chart-1` at 2px over an area fading `chart-area-from` to `chart-area-to`.

## Dark mode

Dark is the `.dark` class on `<html>`, and every token above already has a dark value — write `bg-card text-foreground`, never `dark:bg-slate-800`. The dark theme is built on the same slate family as the hero banner: `background` is the deepest, `card` and `sidebar` sit one step up, `border` one more. `primary` does not change between themes; the soft status grounds all darken and their text lightens, so every badge keeps its meaning and clears 4.5:1.

## Don't

Do not introduce a second accent color, gradient a button, put a colored left border on a card, tint a card ground, use emerald for anything other than the brand's own affordances, drop below 12px text, or invent a control height outside the three above.
