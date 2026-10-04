# Toast

A 396px `popover` card on `radius-lg` with `shadow-lg` and a 3px left edge in the status color — `success` or `danger`. Toasts stack bottom-right, newest at the bottom, four at most.

A 18px status glyph, then a 14px/500 title and an optional `body-sm` `muted-foreground` line, then a ghost `X`. An error may carry one outline action button; a success never does.

```tsx
<Toast className="w-99 gap-3 rounded-lg border border-border border-l-[3px] border-l-success
  bg-popover p-3.5 shadow-lg">
  <CircleCheck className="mt-px size-4.5 text-success" />
  <div>
    <ToastTitle className="text-body font-medium">Company created</ToastTitle>
    <ToastDescription className="mt-0.5 text-body-sm text-muted-foreground">…</ToastDescription>
  </div>
</Toast>
```

Titles are past tense and name what happened — `Company created`, `Coupon deleted`, `Couldn't update the plan`. Success toasts dismiss after 4s; error toasts stay until dismissed, because they usually carry the reason. Anything the user must act on before continuing is a `Modal`, not a toast, and a field-level problem belongs under the field.

This part is not in the screenshots the system was drawn from; it follows `Badge`'s status colors and `DropdownMenu`'s panel so feedback matches the rest.
