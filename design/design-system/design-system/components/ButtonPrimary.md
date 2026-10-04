# ButtonPrimary

The one emerald button on a page — the single action that page exists for: `Add Company`, `Add Coupon`, `Create Plan`, `Save`.

`primary` ground, `primary-foreground` label at `button` size, `radius-lg`, `shadow-sm`, 16px side padding and an 8px gap to a leading `icon-size` lucide glyph. Height is `control-height` by default, `control-height-sm` in a table toolbar and `control-height-lg` for a form's main action.

```tsx
<button className="inline-flex h-control items-center justify-center gap-2 rounded-lg bg-primary px-4
  text-button text-primary-foreground shadow-sm transition-colors
  hover:bg-primary-hover active:bg-primary-active
  focus-visible:border-ring focus-visible:shadow-focus focus-visible:outline-none
  disabled:cursor-not-allowed disabled:opacity-disabled">
  <Plus className="size-icon" /> Add Company
</button>
```

States: `primary-hover` on hover, `primary-active` while pressed, a 1px `ring` border plus `shadow-focus` on keyboard focus, `opacity-disabled` when disabled. Nothing scales or lifts.

You provide the label and an optional leading icon. Two emerald buttons in one view is a mistake — demote one to `ButtonOutline`. White on `primary` is 2.6:1, so never set this button's label below 14px/500, and never use `primary` as text on a light ground: that is what `primary-strong` is for.
