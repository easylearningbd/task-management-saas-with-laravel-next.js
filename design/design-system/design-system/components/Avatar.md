# Avatar

A `radius-full` circle at `avatar-size`, with 28px and 48px variants for dense rows and detail headers.

Three fills, in order of preference: the uploaded photo as an `<img>` filling the circle; initials — one or two letters at 13px/600 on a soft ground from the stat palette, picked by hashing the record id so a company keeps its color; and, failing both, a `User` glyph in `muted-foreground` on `muted`.

```tsx
<Avatar className="size-avatar">
  <AvatarImage src={company.logo} alt="" />
  <AvatarFallback className="bg-info-soft text-[13px] font-semibold text-info">HS</AvatarFallback>
</Avatar>
```

You provide the image URL, the initials and the ground. In a table row the avatar pairs with a two-line identity cell — `title-row` name over a `body-sm` `muted-foreground` email. Stacked avatars overlap 10px with a 2px `avatar-ring` and cap at four, the last circle carrying `+N`. A presence dot is `success-solid` with the same ring. Alt text belongs on the name, not the image: mark the image `alt=""` so it is not read twice.
