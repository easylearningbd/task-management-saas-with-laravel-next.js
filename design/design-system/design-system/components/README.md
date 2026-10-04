# Components

Twenty-eight parts, each with a guideline file here and a live preview in `../previews/`.
Read a component's file before you build with it — the markup block in each one is the
Tailwind v4 / shadcn implementation, not a sketch.

## Foundations

| Component | What it is |
| --- | --- |
| [`Card`](Card.md) | The white panel every page is built from: a 1px `border` hairline, `radius-xl` corners and `shadow-xs` — the border does the separating, not the shadow. |

## Actions

| Component | What it is |
| --- | --- |
| [`ButtonGhost`](ButtonGhost.md) | A borderless button, used almost entirely as the `control-height-sm` square icon button in table row actions, card headers and the breadcrumb bar. |
| [`ButtonOutline`](ButtonOutline.md) | The default button for everything that is not the page's one emerald action: `Cancel`, `Back`, `Filters`, `Refresh`, and every toolbar control. |
| [`ButtonPrimary`](ButtonPrimary.md) | The one emerald button on a page — the single action that page exists for: `Add Company`, `Add Coupon`, `Create Plan`, `Save`. |

## Forms

| Component | What it is |
| --- | --- |
| [`Checkbox`](Checkbox.md) | A 16px box on `radius-sm` with a 1px `input` border, filling `primary` with a white `Check` when on. |
| [`DateInput`](DateInput.md) | A native `<input type="date">` wearing the `Input` skin, with a `Calendar` glyph in `muted-foreground`. |
| [`Input`](Input.md) | The 36px text field every form is built from: `card` ground, 1px `input` border, `radius-lg`, 12px side padding, `body` text with a `muted-foreground` placeholder. |
| [`Radio`](Radio.md) | An 18px circle with a 1px `input` border; when selected the border becomes `primary` and a `primary` dot fills the middle 10px. |
| [`SearchInput`](SearchInput.md) | An `Input` at `control-height-lg` with a leading `Search` glyph, used once per list page as the first control in the filter bar. |
| [`Select`](Select.md) | A shadcn `Select` shaped exactly like `Input` — same height, border, radius and padding — with a trailing `ChevronDown` in `muted-foreground`. |
| [`Switch`](Switch.md) | A 44×24 track on `radius-full` with a 20px white knob carrying `shadow-sm`. |
| [`Textarea`](Textarea.md) | The `Input` skin at three rows tall with 10px vertical padding and the browser resize grip left on — vertical only. |

## Status

| Component | What it is |
| --- | --- |
| [`Badge`](Badge.md) | A 24px pill on `radius-md` with 10px side padding and `badge` text — soft ground, colored text, never a solid fill and never a border. |

## Data display

| Component | What it is |
| --- | --- |
| [`Avatar`](Avatar.md) | A `radius-full` circle at `avatar-size`, with 28px and 48px variants for dense rows and detail headers. |
| [`EmptyState`](EmptyState.md) | What a card shows instead of a table when there is nothing to show. |
| [`Pagination`](Pagination.md) | A row of `control-height-sm` cells on `radius-lg` with a 1px `border` and `shadow-sm`. |
| [`ProgressBar`](ProgressBar.md) | A `progress-height` track on `radius-sm` in `track`, filled `primary` from the left. |
| [`ProgressRing`](ProgressRing.md) | A ring for a single figure against its own maximum — plan storage, trial days used, quota consumed. |
| [`RowsPerPage`](RowsPerPage.md) | The page-size control in a table footer: a `body-sm` `muted-foreground` label followed by a compact `control-height-sm` select carrying the current value at 13px/500. |
| [`StatCard`](StatCard.md) | The metric tile that opens a dashboard. |
| [`Table`](Table.md) | The workhorse of both dashboards. |

## Navigation

| Component | What it is |
| --- | --- |
| [`HeroBanner`](HeroBanner.md) | The greeting panel that opens the dashboard, and the only dark surface in the product: a 160px `hero` card on `radius-xl` with soft glows rising from the bottom edge and a scatter of small dots. |
| [`SidebarNav`](SidebarNav.md) | The fixed `sidebar-width` column both dashboards navigate from: a `sidebar` ground with a 1px `sidebar-border` right edge, full height, never scrolled away. |
| [`Tabs`](Tabs.md) | An underline tab bar for switching a table between subsets of the same records — the status filters on Plan Requests, the sections of a detail page. |
| [`ViewToggle`](ViewToggle.md) | Two 34×26 icon buttons in a 3px-padded `card` shell with a 1px `border` and `shadow-sm`, sitting at the right end of a filter bar. |

## Overlays

| Component | What it is |
| --- | --- |
| [`DropdownMenu`](DropdownMenu.md) | A `popover` panel on `radius-lg` with a 1px `border`, `shadow-lg` and 4px padding, anchored 4px below its trigger and aligned to the trigger's edge. |
| [`Modal`](Modal.md) | A `card` sheet on `radius-xl` with `shadow-xl`, centred over an `overlay` scrim. |
| [`Toast`](Toast.md) | A 396px `popover` card on `radius-lg` with `shadow-lg` and a 3px left edge in the status color — `success` or `danger`. |

## Not drawn from the screenshots

Four parts had no example in the source captures and were built from the system's own
tokens and neighbouring components. Each says so at the end of its own file:
`Checkbox`, `Tabs`, `Toast`, `ProgressRing`.

Three more were added because every page needs them, and they *are* in the captures:
`Card`, `SidebarNav`, `HeroBanner`.
