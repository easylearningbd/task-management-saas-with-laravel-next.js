# Checkbox

A 16px box on `radius-sm` with a 1px `input` border, filling `primary` with a white `Check` when on. Indeterminate shows an 8px white bar instead — that is the header checkbox of a partly selected table.

Use it for options that apply on Save and for row selection. A setting that takes effect immediately is a `Switch`.

```tsx
<Checkbox className="size-4 rounded-sm border border-input
  data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground
  focus-visible:border-ring focus-visible:shadow-focus focus-visible:outline-none
  disabled:cursor-not-allowed disabled:opacity-disabled" />
```

You provide the label and, for tables, the selection state. A checkbox column is 48px wide and the header's box drives select-all across the current page only — never across pages you have not loaded. Once anything is selected, the table toolbar is replaced by a bulk bar on an `accent` ground reading `N companies selected`.

This control is not in the screenshots the system was drawn from; it follows `Radio` and `Switch` so selection and multi-choice forms have a consistent part.
