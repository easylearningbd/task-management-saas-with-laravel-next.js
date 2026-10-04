# Textarea

The `Input` skin at three rows tall with 10px vertical padding and the browser resize grip left on — vertical only.

```tsx
<textarea rows={3} placeholder="Enter a brief description of the plan"
  className="min-h-[92px] w-full resize-y rounded-lg border border-input bg-card px-3 py-2.5 text-body
    placeholder:text-muted-foreground
    focus-visible:border-ring focus-visible:shadow-focus focus-visible:outline-none
    disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-disabled" />
```

You provide the row count and any character limit. When there is a limit, show `used / total` as right-aligned `caption` helper text and turn it `danger` only once it is exceeded. Never auto-grow past about ten rows — move to a full editor instead.
