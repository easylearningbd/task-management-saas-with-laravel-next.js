# Tailwind theme

The whole theme, ready to paste into `app/globals.css`. Tailwind v4 has no `tailwind.config.js`: raw values live on `:root` and `.dark`, and the `@theme inline` block at the end turns each one into utilities — `--color-card` gives you `bg-card`, `text-card` and `border-card`; `--text-title-page` gives you `text-title-page` with its line height and weight already attached; `--spacing-sidebar` gives you `w-sidebar`, and `--spacing-control` gives you `h-control`.

Dark mode is the `.dark` class on `<html>`, wired by the `@custom-variant` on line 7. Nothing in the app needs a `dark:` prefix — use the semantic utility and both themes follow.

The full block lives in `globals.css` at the root of this folder — copy that file, do not retype it.

Three rules when you extend it:

1. A new color goes in `:root` **and** `.dark`, then gets one line in `@theme inline`. A token with only one theme value is a bug.
2. Name by job, not by hue — `warning`, not `yellow`. The only hue-named tokens are the five stat-card sets and the five chart series, and both are fixed-length.
3. Check any text/ground pair you add at 4.5:1 in both themes before it ships.
