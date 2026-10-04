# StatCard

The metric tile that opens a dashboard. A 164px card on `radius-xl` with a flat tinted ground, a 40px `radius-tile` icon square, and two decorative circles of the icon-square color bleeding off the right edge — no border, no shadow.

Inside, top to bottom: the tile with a 20px lucide glyph, a `caption` label in `stat-<hue>-label`, the figure at 24px/700 in `stat-<hue>-value`, and a `caption` note in the label color at 85% opacity.

Five hues in a fixed order — `emerald`, `blue`, `violet`, `indigo`, `amber` — each with its own ground, tile, icon, label and value token:

```tsx
<div className="relative h-41 w-full overflow-hidden rounded-xl bg-stat-emerald p-5">
  <span className="inline-flex size-tile items-center justify-center rounded-tile
    bg-stat-emerald-icon-bg text-stat-emerald-icon">
    <Wallet className="size-icon-lg" />
  </span>
  <p className="mt-4 text-caption text-stat-emerald-label">Total Revenue</p>
  <p className="mt-1 text-2xl font-bold text-stat-emerald-value">$2,961.20</p>
  <p className="text-caption text-stat-emerald-label/85">from approved orders</p>
</div>
```

You provide the icon, label, figure and note. The hue carries no meaning — it separates five tiles in a row, so keep the order stable across reloads and never recolor a tile to signal a state. When a tile needs attention, add the `warning` chip top-right as the amber card does; that chip, not the ground, is the signal.

The figure is the only 24px number on the page. Money keeps two decimals, growth keeps its sign, and counts stay bare.
