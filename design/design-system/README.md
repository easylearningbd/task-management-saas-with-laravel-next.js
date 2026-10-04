# TASK design system

Extracted from the Super Admin UI screenshots and rebuilt as tokens, rules and previews for
**Next.js 16 · Tailwind CSS v4 · shadcn/ui · lucide-react**.

```
task-design-system/
├── CLAUDE.md                     ← the rules Claude Code reads automatically
├── globals.css                   ← the whole theme: :root, .dark, @theme inline
├── tokens.json                   ← the same tokens as data, for scripts and tooling
├── design-system/
│   ├── brand-book.md             ← voice, color, type, space, states, dark mode
│   ├── tailwind-theme.md         ← how the theme file is wired, and how to extend it
│   └── components/
│       ├── README.md             ← index of all 28
│       └── <Name>.md             ← anatomy, markup, states, rules — one per component
└── previews/
    ├── index.html                ← open this: every component, light and dark
    ├── <Name>.html               ← one component, standalone
    └── tokens.css                ← compiled variables the previews render from
```

## Look at it first

Open `previews/index.html` in a browser. No server, no build — every component in one page with
a light/dark switch. Each preview is also a standalone file, so
`previews/ButtonPrimary.html?theme=dark` works on its own.

## Install into the app

**1. Theme.** Copy `globals.css` over `app/globals.css`. It starts with `@import "tailwindcss"`
and ends with the `@theme inline` block, so it replaces the file rather than sitting beside it.
Tailwind v4 needs no `tailwind.config.js`.

**2. Dark mode.** The theme declares `@custom-variant dark (&:is(.dark *))`, so toggling is just
the class:

```tsx
// app/layout.tsx
<html lang="en" suppressHydrationWarning>
```

Then drive `document.documentElement.classList.toggle('dark', …)` from your theme toggle, or use
`next-themes` with `attribute="class"`.

**3. Font.** The stack starts with Inter. Add it once:

```tsx
import { Inter } from 'next/font/google'
const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
// <body className={inter.variable}>  — then in globals.css set
// --font-sans: var(--font-inter), ui-sans-serif, system-ui, sans-serif;
```

Skip this and it falls back to the system UI font, which is close but not identical to the
screenshots.

**4. shadcn/ui.** `npx shadcn@latest init`, then add components as you need them. They read
`--background`, `--foreground`, `--card`, `--primary`, `--muted`, `--accent`, `--border`,
`--input`, `--ring` and `--radius`, all of which this theme defines — so they arrive already
wearing TASK. When the CLI offers to write its own colors into `globals.css`, decline; this file
is the source of truth.

**5. Claude Code.** Copy `CLAUDE.md` to your repo root (or append it to an existing one) and put
`design-system/` next to it. That is what keeps generated UI on-system: the token vocabulary, the
hard rules, and a pointer to the per-component markup. Point at a specific file when you want
exact output — *"build the companies table following design-system/components/Table.md"*.

## What the tokens are worth knowing about

- `primary` is `#10b77f`. White on it is 2.6:1 — the product's own pairing, kept exact on filled
  buttons. Green **text** on a light ground is `primary-strong` (`#007a55`, 5.4:1).
- `ring` is `#0ea372`, one step darker than primary, so the focus ring itself clears 3:1.
- `input` (`#e5e5e5`) is 1.3:1 on white — the product's hairline. If a build has to clear the 3:1
  non-text floor, change that one token to `#8f8f8f` and leave everything else alone.
- Radii match Tailwind's defaults, so `rounded-lg` is already the 8px button corner and
  `rounded-xl` the 12px card corner. `rounded-tile` (10px) is the one off-scale value.
- Dark values are derived, not photographed — the source has no dark screenshots. They are built
  on the same slate family as the dashboard hero, and every text/ground pair clears 4.5:1.
- `Checkbox`, `Tabs`, `Toast` and `ProgressRing` had no example in the screenshots and were built
  from the system's own parts. Each says so at the end of its file.

One copy fix worth making while you build: the table footer currently reads *"Raws per page"*.
It should be *"Rows per page"*.
