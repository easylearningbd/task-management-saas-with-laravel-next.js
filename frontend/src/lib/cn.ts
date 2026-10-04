import { clsx, type ClassValue } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

/* tailwind-merge must know the design system's named tokens (globals.css @theme):
   otherwise it reads `text-body` as a color and drops it when a `text-muted-foreground`
   follows, and cannot tell that `h-control-lg` should replace `h-control`. */
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      spacing: [
        'sidebar', 'topbar', 'control-sm', 'control', 'control-lg', 'thead', 'row', 'card',
        'icon', 'icon-lg', 'tile', 'fab', 'avatar',
      ],
      radius: ['tile'],
    },
    classGroups: {
      'font-size': [
        {
          text: [
            'display-lg', 'display', 'title-page', 'title-section', 'title-card', 'title-row',
            'body', 'body-sm', 'label', 'table-head', 'button', 'button-sm', 'caption', 'badge',
            'money', 'code',
          ],
        },
      ],
      shadow: [{ shadow: ['focus', 'focus-danger'] }],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
