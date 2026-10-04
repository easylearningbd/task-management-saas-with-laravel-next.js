# HeroBanner

The greeting panel that opens the dashboard, and the only dark surface in the product: a 160px `hero` card on `radius-xl` with soft glows rising from the bottom edge and a scatter of small dots.

Left side: `Good morning,` in `hero-muted`, the name at `display` in `hero-foreground`, a `body-sm` `hero-muted` line, then a live figure in `hero-accent` behind three fading dots. Right side: glassy stat chips on `hero-chip` with a `hero-chip-border` hairline — a 17px/700 figure over an 11px `hero-muted` caption — followed by borderless icon shortcuts.

The ground is built from three radial glows in `hero-glow-teal` and `hero-glow-slate`, all anchored below the bottom edge so they warm the lower half without becoming a gradient banner:

```tsx
<div className="relative h-40 overflow-hidden rounded-xl bg-hero p-6 px-7 text-hero-foreground">
  <div className="absolute inset-0 [background:radial-gradient(420px_150px_at_18%_118%,var(--hero-glow-teal),transparent_70%),radial-gradient(360px_140px_at_62%_128%,var(--hero-glow-slate),transparent_72%)]" />
  <div className="relative">
    <p className="text-body text-hero-muted">Good morning,</p>
    <p className="text-display">Super Admin</p>
  </div>
</div>
```

You provide the greeting, the name and the figures. The greeting follows the viewer's local clock; the name is the signed-in user's, not the company's. One figure gets `hero-accent` — the rest stay `hero-foreground`, or the banner turns into a chart. Shortcuts cap at three.

Both themes use the same ground: `hero` only deepens in dark, so white text stays at 14.6:1 either way. Never put a `Badge` on the hero — soft status grounds are built for light surfaces and disappear here.
