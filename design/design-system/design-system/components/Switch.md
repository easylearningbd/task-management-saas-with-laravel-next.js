# Switch

A 44×24 track on `radius-full` with a 20px white knob carrying `shadow-sm`. Off is `track`, on is `primary` — the one place besides buttons where the brand emerald fills a shape.

Use it for settings that apply the moment they are flipped: `Enable Login`, `Active`, `AI Integration`, a coupon's status in a table. A setting that only applies on Save is a `Checkbox`, not a switch.

```tsx
<Switch className="h-6 w-11 rounded-full bg-track data-[state=checked]:bg-primary
  focus-visible:shadow-focus focus-visible:outline-none
  disabled:cursor-not-allowed disabled:opacity-disabled" />
```

The label sits left of the switch in a form row and at the far left of a settings row with the switch right-aligned. The label always says what the *on* state means — `Enable Login`, never `Login disabled`. A switch in a table row toggles that record immediately and shows a `Toast` on failure, reverting itself.

A 36×20 `sm` size exists for dense table rows. Do not add a third size, and never put text inside the track.
