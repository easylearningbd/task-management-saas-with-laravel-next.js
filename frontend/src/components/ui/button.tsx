import * as React from 'react'
import { Slot } from 'radix-ui'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/cn'
import { Spinner } from '@/components/ui/spinner'

/* design-system/components/ButtonPrimary.md · ButtonOutline.md · ButtonGhost.md
   One `primary` per view; everything else is `outline` or `ghost`.
   Three heights only: sm (toolbar), default, lg (a form's main action). */
const buttonVariants = cva(
  'inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-lg transition-colors ' +
    'focus-visible:outline-none focus-visible:shadow-focus ' +
    'disabled:cursor-not-allowed disabled:opacity-disabled',
  {
    variants: {
      variant: {
        primary:
          'bg-primary text-primary-foreground shadow-sm hover:bg-primary-hover active:bg-primary-active focus-visible:border-ring',
        outline:
          'border border-border bg-card text-foreground shadow-sm hover:bg-accent focus-visible:border-ring',
        ghost:
          'text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:border focus-visible:border-ring',
        // Modal.md: only inside a confirm-delete dialog. No hover token exists, so hover
        // dims the same `destructive` fill to 90% rather than introducing a new color.
        destructive:
          'bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90 focus-visible:shadow-focus-danger',
      },
      size: {
        sm: 'h-control-sm gap-1.5 px-3 text-button-sm',
        default: 'h-control gap-2 px-4 text-button',
        lg: 'h-control-lg gap-2 px-4 text-button',
        'icon-sm': 'size-control-sm',
        icon: 'size-control',
      },
    },
    defaultVariants: { variant: 'primary', size: 'default' },
  },
)

type ButtonProps = React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    /** Render the child element (e.g. a Link) with button styling. */
    asChild?: boolean
    /** Shows a spinner in place of the leading icon and disables the button. */
    loading?: boolean
  }

function Button({
  className,
  variant,
  size,
  asChild = false,
  loading = false,
  disabled,
  children,
  type,
  ...props
}: ButtonProps) {
  const classes = cn(buttonVariants({ variant, size }), className)

  if (asChild) {
    return (
      <Slot.Root className={classes} {...props}>
        {children}
      </Slot.Root>
    )
  }

  return (
    <button
      type={type ?? 'button'}
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <Spinner /> : null}
      {children}
    </button>
  )
}

export { Button, buttonVariants }
export type { ButtonProps }
