'use client'

import * as React from 'react'
import type { LucideIcon } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Tooltip } from '@/components/ui/tooltip'
import { cn } from '@/lib/cn'

/* A tab bar on the WAI-ARIA tablist pattern, in two looks:
   - `underline` — design-system/components/Tabs.md: a 42px row over a 1px `border` rule;
     14px/500 labels in `muted-foreground`, `foreground` on hover and when active; the active
     tab carries a 2px `primary` bar on the rule. A count rides in a 20px `radius-md` chip —
     `muted` / `muted-foreground` at rest, `primary-soft` / `primary-strong` when active. An
     optional leading 16px glyph (the Projects screenshot's status tabs).
   - `pill` — the project details screenshot: ViewToggle.md's SegmentedControl track (`muted`
     on `radius-tile`, 4px padding, 44px); the active tab is a `card` pill with `shadow-sm`, the
     others `muted-foreground`. A count reads "Items (3)".
   Keyboard: one tab stop (roving tabindex). Left / Right move between tabs, Home / End jump
   to the ends, wrapping round; disabled tabs are skipped. `activation="manual"` (default)
   moves focus only and Enter / Space selects — right when a tab triggers a fetch;
   `automatic` selects on arrow. A disabled tab can carry a hint ("Coming soon") shown as a
   tooltip on hover and read with the tab's name.
   Every tab controls one panel: render <TabPanel idBase=… value=…> with the same `idBase`.
   On narrow screens the row scrolls sideways; the focused tab is kept in view. */

export type TabItem<T extends string> = {
  value: T
  label: string
  icon?: LucideIcon
  /** Shown when given, including 0 (Tabs.md: counts are always shown). */
  count?: number
  disabled?: boolean
  /** Why it's disabled, e.g. "Coming soon". */
  disabledHint?: string
}

const tabId = (idBase: string, value: string) => `${idBase}-tab-${value}`
const panelId = (idBase: string) => `${idBase}-panel`

export function Tabs<T extends string>({
  items,
  value,
  onValueChange,
  label,
  idBase,
  variant = 'underline',
  activation = 'manual',
  className,
}: {
  items: ReadonlyArray<TabItem<T>>
  value: T
  onValueChange: (value: T) => void
  /** Accessible name of the tablist, e.g. "Project status". */
  label: string
  /** Prefix for the tab / panel ids (shared with TabPanel). */
  idBase: string
  variant?: 'underline' | 'pill'
  activation?: 'manual' | 'automatic'
  className?: string
}) {
  const t = useTranslations('shared.tabs')
  const refs = React.useRef(new Map<T, HTMLButtonElement>())
  const enabled = items.filter((item) => !item.disabled)

  const focusTab = (next: TabItem<T>) => {
    const node = refs.current.get(next.value)
    node?.focus()
    node?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
    if (activation === 'automatic') onValueChange(next.value)
  }

  const onKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, current: T) => {
    if (enabled.length === 0) return
    const index = enabled.findIndex((item) => item.value === current)
    let next: TabItem<T> | undefined
    if (event.key === 'ArrowRight') next = enabled[(index + 1) % enabled.length]
    else if (event.key === 'ArrowLeft') next = enabled[(index - 1 + enabled.length) % enabled.length]
    else if (event.key === 'Home') next = enabled[0]
    else if (event.key === 'End') next = enabled[enabled.length - 1]
    if (!next) return
    event.preventDefault()
    focusTab(next)
  }

  // The tab stop is the selected tab, or the first enabled one if the selection is disabled.
  const tabStop = items.some((item) => item.value === value && !item.disabled) ? value : enabled[0]?.value

  const pill = variant === 'pill'

  return (
    <div className={cn('overflow-x-auto', pill ? 'rounded-tile' : '', className)}>
      <div
        role="tablist"
        aria-label={label}
        aria-orientation="horizontal"
        className={cn(
          'flex w-max min-w-full items-center',
          pill ? 'h-11 gap-1 rounded-tile bg-muted p-1' : 'h-[42px] gap-6 border-b border-border',
        )}
      >
        {items.map((item) => {
          const selected = item.value === value
          const Icon = item.icon
          const hasCount = item.count !== undefined
          const text = pill && hasCount ? t('withCount', { label: item.label, count: item.count ?? 0 }) : item.label

          const tab = (
            <button
              key={item.value}
              ref={(node) => {
                if (node) refs.current.set(item.value, node)
                else refs.current.delete(item.value)
              }}
              type="button"
              role="tab"
              id={tabId(idBase, item.value)}
              aria-selected={selected}
              aria-controls={panelId(idBase)}
              aria-disabled={item.disabled || undefined}
              disabled={item.disabled}
              tabIndex={item.value === tabStop ? 0 : -1}
              onClick={() => {
                if (!item.disabled && !selected) onValueChange(item.value)
              }}
              onKeyDown={(event) => onKeyDown(event, item.value)}
              className={cn(
                'relative inline-flex shrink-0 items-center gap-2 text-body font-medium whitespace-nowrap transition-colors',
                'focus-visible:shadow-focus focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-disabled',
                pill
                  ? cn(
                      'h-full rounded-lg px-4',
                      selected ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground enabled:hover:text-foreground',
                    )
                  : cn(
                      'h-[42px] rounded-sm',
                      selected
                        ? 'text-foreground after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:rounded-sm after:bg-primary'
                        : 'text-muted-foreground enabled:hover:text-foreground',
                    ),
              )}
            >
              {Icon ? <Icon className="size-icon shrink-0" aria-hidden="true" /> : null}
              {text}
              {!pill && hasCount ? (
                <span
                  className={cn(
                    'inline-flex h-5 min-w-5 items-center justify-center rounded-md px-1.5 text-[11px] font-medium',
                    selected ? 'bg-primary-soft text-primary-strong' : 'bg-muted text-muted-foreground',
                  )}
                >
                  {item.count}
                </span>
              ) : null}
              {item.disabled && item.disabledHint ? <span className="sr-only">{` (${item.disabledHint})`}</span> : null}
            </button>
          )

          // A disabled button fires no pointer events, so its tooltip rides on a wrapper.
          return item.disabled && item.disabledHint ? (
            <Tooltip key={item.value} content={item.disabledHint}>
              <span className={cn('inline-flex shrink-0', pill && 'h-full')}>{tab}</span>
            </Tooltip>
          ) : (
            tab
          )
        })}
      </div>
    </div>
  )
}

/** The region the tabs control — labelled by the selected tab. */
export function TabPanel({
  idBase,
  value,
  className,
  ...props
}: React.ComponentProps<'div'> & { idBase: string; value: string }) {
  return (
    <div
      role="tabpanel"
      id={panelId(idBase)}
      aria-labelledby={tabId(idBase, value)}
      tabIndex={0}
      className={cn('focus-visible:shadow-focus focus-visible:outline-none', className)}
      {...props}
    />
  )
}
