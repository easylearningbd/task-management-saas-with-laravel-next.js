# Modal

A `card` sheet on `radius-xl` with `shadow-xl`, centred over an `overlay` scrim. Two widths: 468px for a single column of fields, 872px for the two-column forms like Add New Coupon. Height is the content's; past the viewport the body scrolls and the header and footer stay put.

Three parts. The header pads 22px/24px and holds a `title-section` title and a ghost `X` in `muted-foreground`. The body pads 0/24px/22px and stacks fields 18px apart. The footer sits above a 1px `border` rule with the actions right-aligned — `Cancel` as `ButtonOutline` then the primary action.

```tsx
<DialogContent className="w-[468px] gap-0 rounded-xl border-0 bg-card p-0 shadow-xl">
  <DialogHeader className="flex-row items-start justify-between gap-4 p-6 pb-4.5">
    <DialogTitle className="text-title-section">Add New Company</DialogTitle>
  </DialogHeader>
  <div className="flex flex-col gap-4.5 px-6 pb-5.5">{fields}</div>
  <DialogFooter className="gap-2.5 border-t border-border px-6 py-3.5">
    <button className="…outline">Cancel</button>
    <button className="…primary">Save</button>
  </DialogFooter>
</DialogContent>
```

You provide the title, the fields and the submit handler. The title names the action — `Add New Company`, `Edit Plan`, `Delete Coupon` — never just the noun. Focus moves to the first field on open and returns to the trigger on close; Escape and a scrim click both cancel, except while a submit is in flight.

Use a modal for creating or editing one record. A destructive confirm is the same sheet at 420px with the primary action swapped for a `destructive` fill and the record's name repeated in the body. Anything longer than about eight fields belongs on its own page, the way Create Plan does.
