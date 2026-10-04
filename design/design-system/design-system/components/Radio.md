# Radio

An 18px circle with a 1px `input` border; when selected the border becomes `primary` and a `primary` dot fills the middle 10px.

Radios are for two or three mutually exclusive choices that change the form around them — `Manual Entry` / `Auto Generate` switches which field below is enabled. Four or more choices belong in a `Select`.

```tsx
<RadioGroup className="flex items-center gap-6">
  <div className="inline-flex items-center gap-2">
    <RadioGroupItem id="manual" value="manual"
      className="size-[18px] rounded-full border border-input
        data-[state=checked]:border-primary data-[state=checked]:text-primary
        focus-visible:border-ring focus-visible:shadow-focus focus-visible:outline-none" />
    <label htmlFor="manual" className="text-body">Manual Entry</label>
  </div>
</RadioGroup>
```

The group carries a `label` above it, with a `destructive` asterisk when a choice is required, and one option is always preselected. Options run inline `space-6` apart when their labels are short, stacked `space-2` apart when they carry helper text. The whole label is a click target.
