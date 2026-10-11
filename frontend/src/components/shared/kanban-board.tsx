'use client'

import * as React from 'react'
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type DraggableSyntheticListeners,
  type UniqueIdentifier,
} from '@dnd-kit/core'
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useTranslations } from 'next-intl'
import { Badge } from '@/components/ui/badge'
import { isHexColor } from '@/lib/hex-color'
import { cn } from '@/lib/cn'

/* A Kanban board (dnd-kit, the same setup as SortableList) — generic: it knows nothing about
   what it shows. One column per entry of `columns`, left to right; the board scrolls sideways
   and each column's body scrolls on its own (give it a height through `columnBodyClassName`).
   - A column: a `muted` well on `radius-xl` (Phase 0 decision 7: neutral — the design system
     has no stage tint) with a 1px `border`, a header with a 10px dot in the column's own colour
     (data, validated as #RRGGBB, else `neutral`), the title (`title-row` at 600, as the cards'
     titles in the screenshot) and, right after it, a `neutral` count pill (outlined, so it
     reads on the `muted` header).
   - The whole card drags (decision 8), wrapped by KanbanCard:
       mouse  — after a 4px move, so clicks on the card's buttons and links still work; a drag
                never starts on a button, link or field inside the card;
       touch  — press and hold 250ms (a 5px wobble allowed), so the board still scrolls;
       keyboard — focus a card, Space/Enter picks it up, ←/→ move it across columns, ↑/↓
                within one, Space/Enter drops, Escape cancels. Screen readers hear our own
                announcements (column, position).
   - While dragging, the card stays in the layout at `opacity-disabled` and moves between
     columns as it is carried; a copy follows the pointer in a DragOverlay (`shadow-lg`).
   - On drop, `onMove` gets the item, both columns and the 0-based target index — only when
     something changed. The board shows the dropped layout at once and keeps it until
     `columns` changes (the caller's optimistic update, its rollback, or a refetch).
   - `disabled`: nothing drags and cards aren't focusable as drag handles (e.g. while the board
     is filtered — reordering a filtered column would write a wrong sequence). */

export type KanbanColumnData<T, C extends UniqueIdentifier> = {
  id: C
  title: string
  /** The column's own colour (#RRGGBB), as a dot before the title. */
  color?: string | null
  items: ReadonlyArray<T>
}

export type KanbanMove<I extends UniqueIdentifier, C extends UniqueIdentifier> = {
  itemId: I
  fromColumnId: C
  toColumnId: C
  fromIndex: number
  /** 0-based, in the target column after the move. */
  toIndex: number
}

export type KanbanBoardProps<T, I extends UniqueIdentifier, C extends UniqueIdentifier> = {
  columns: ReadonlyArray<KanbanColumnData<T, C>>
  getItemId: (item: T) => I
  /** How a card is named to assistive tech ("Design the login page"). */
  getItemLabel: (item: T) => string
  renderItem: (item: T, state: { dragging: boolean; overlay: boolean }) => React.ReactNode
  onMove: (move: KanbanMove<I, C>) => void
  disabled?: boolean
  /** The board's accessible name. */
  label: string
  /** Shown in a column with no cards (it still takes drops). */
  emptyColumnLabel: string
  /** Height limits for each column's scrolling body. */
  columnBodyClassName?: string
  className?: string
}

/* dnd-kit shares one id space between droppables and draggables, so columns and items get
   prefixed keys here; the caller only ever sees its own ids. */
type Key = string
const itemKey = (id: UniqueIdentifier): Key => `item:${String(id)}`
const columnKey = (id: UniqueIdentifier): Key => `column:${String(id)}`

type Layout = Record<Key, Key[]>

export function KanbanBoard<T, I extends UniqueIdentifier, C extends UniqueIdentifier>({
  columns,
  getItemId,
  getItemLabel,
  renderItem,
  onMove,
  disabled = false,
  label,
  emptyColumnLabel,
  columnBodyClassName,
  className,
}: KanbanBoardProps<T, I, C>) {
  const t = useTranslations('shared.kanban')
  const dndId = React.useId()
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  // Lookups from the caller's data.
  const { items, columnIds, columnTitles, columnColors, fromProps } = React.useMemo(() => {
    const itemMap = new Map<Key, { item: T; id: I }>()
    const ids = new Map<Key, C>()
    const titles = new Map<Key, string>()
    const colors = new Map<Key, string | null>()
    const layout: Layout = {}
    for (const column of columns) {
      const key = columnKey(column.id)
      ids.set(key, column.id)
      titles.set(key, column.title)
      colors.set(key, column.color ?? null)
      layout[key] = column.items.map((item) => {
        const id = getItemId(item)
        itemMap.set(itemKey(id), { item, id })
        return itemKey(id)
      })
    }
    return { items: itemMap, columnIds: ids, columnTitles: titles, columnColors: colors, fromProps: layout }
  }, [columns, getItemId])

  // The layout shown: the props', or the one being dragged / just dropped (until `columns` changes).
  const [local, setLocal] = React.useState<{ for: typeof columns; layout: Layout } | null>(null)
  const layout = local && local.for === columns ? local.layout : fromProps

  const [active, setActive] = React.useState<{ key: Key; fromColumn: Key; fromIndex: number } | null>(null)

  const columnOf = React.useCallback(
    (key: UniqueIdentifier, within: Layout): Key | undefined => {
      const k = String(key)
      if (k in within) return k
      return Object.keys(within).find((column) => within[column].includes(k))
    },
    [],
  )

  const nameOf = (key: UniqueIdentifier) => {
    const entry = items.get(String(key))
    return entry ? getItemLabel(entry.item) : String(key)
  }
  /** Where the carried card would land: its column (it moves there as it is carried) and, within
   *  a column, the place of the card it is over (the sortable strategy only shifts the others). */
  const placeOf = (key: UniqueIdentifier, overKey?: UniqueIdentifier) => {
    const column = columnOf(key, layout)
    if (!column) return { column: '', position: 0, total: 0 }
    const list = layout[column]
    const overIndex = overKey === undefined ? -1 : list.indexOf(String(overKey))
    const index = overIndex === -1 ? list.indexOf(String(key)) : overIndex
    return { column: columnTitles.get(column) ?? '', position: index + 1, total: list.length }
  }

  // The last place announced: a "moved" message only when the place actually changed.
  const announced = React.useRef('')
  const announcements: Announcements = {
    onDragStart: ({ active: a }) => {
      const place = placeOf(a.id)
      announced.current = `${place.column}#${place.position}`
      return t('pickedUp', { item: nameOf(a.id), ...place })
    },
    onDragOver: ({ active: a, over }) => {
      if (!over) return undefined
      const place = placeOf(a.id, over.id)
      const id = `${place.column}#${place.position}`
      if (id === announced.current) return undefined
      announced.current = id
      return t('movedOver', { item: nameOf(a.id), ...place })
    },
    onDragEnd: ({ active: a, over }) =>
      over ? t('dropped', { item: nameOf(a.id), ...placeOf(a.id, over.id) }) : t('cancelled', { item: nameOf(a.id) }),
    onDragCancel: ({ active: a }) => t('cancelled', { item: nameOf(a.id) }),
  }

  const onDragStart = ({ active: a }: DragStartEvent) => {
    const key = String(a.id)
    const fromColumn = columnOf(key, layout)
    if (!fromColumn) return
    setActive({ key, fromColumn, fromIndex: layout[fromColumn].indexOf(key) })
    setLocal({ for: columns, layout })
  }

  // Carrying a card over another column moves it there at once (the classic multi-column pattern).
  const onDragOver = ({ active: a, over }: DragOverEvent) => {
    if (!over) return
    const key = String(a.id)
    const from = columnOf(key, layout)
    const to = columnOf(over.id, layout)
    if (!from || !to || from === to) return

    const target = layout[to]
    const overIndex = target.indexOf(String(over.id))
    let index = overIndex === -1 ? target.length : overIndex
    // Below the middle of the card it's over: after it.
    const translated = a.rect.current.translated
    if (overIndex !== -1 && translated && translated.top > over.rect.top + over.rect.height / 2) index += 1

    setLocal({
      for: columns,
      layout: {
        ...layout,
        [from]: layout[from].filter((k) => k !== key),
        [to]: [...target.slice(0, index), key, ...target.slice(index)],
      },
    })
  }

  const onDragEnd = ({ active: a, over }: DragEndEvent) => {
    const started = active
    setActive(null)
    if (!started) return
    const key = String(a.id)
    const column = columnOf(key, layout)
    if (!over || !column) {
      setLocal(null)
      return
    }

    let next = layout
    const list = layout[column]
    const from = list.indexOf(key)
    const overIndex = list.indexOf(String(over.id))
    if (overIndex !== -1 && overIndex !== from) {
      next = { ...layout, [column]: arrayMove(list, from, overIndex) }
    }
    const toIndex = next[column].indexOf(key)

    if (column === started.fromColumn && toIndex === started.fromIndex) {
      setLocal(null)
      return
    }
    setLocal({ for: columns, layout: next })

    const entry = items.get(key)
    const fromColumnId = columnIds.get(started.fromColumn)
    const toColumnId = columnIds.get(column)
    if (!entry || fromColumnId === undefined || toColumnId === undefined) return
    onMove({ itemId: entry.id, fromColumnId, toColumnId, fromIndex: started.fromIndex, toIndex })
  }

  const onDragCancel = () => {
    setActive(null)
    setLocal(null)
  }

  const activeItem = active ? items.get(active.key)?.item : undefined

  return (
    <DndContext
      id={dndId}
      sensors={sensors}
      collisionDetection={closestCorners}
      accessibility={{ announcements, screenReaderInstructions: { draggable: t('instructions') } }}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onDragCancel={onDragCancel}
    >
      <div role="region" aria-label={label} className={cn('flex gap-4 overflow-x-auto pb-2', className)}>
        {Object.keys(layout).map((column) => (
          <KanbanColumn
            key={column}
            droppableId={column}
            title={columnTitles.get(column) ?? ''}
            color={columnColors.get(column) ?? null}
            count={layout[column].length}
            isEmpty={layout[column].length === 0}
            emptyLabel={emptyColumnLabel}
            bodyClassName={columnBodyClassName}
          >
            <SortableContext items={layout[column]} strategy={verticalListSortingStrategy} disabled={disabled}>
              {layout[column].map((key) => {
                const entry = items.get(key)
                if (!entry) return null
                return (
                  <KanbanCard key={key} id={key} label={getItemLabel(entry.item)} disabled={disabled}>
                    {(dragging) => renderItem(entry.item, { dragging, overlay: false })}
                  </KanbanCard>
                )
              })}
            </SortableContext>
          </KanbanColumn>
        ))}
      </div>
      <DragOverlay>
        {activeItem !== undefined ? <div className="cursor-grabbing rounded-xl shadow-lg">{renderItem(activeItem, { dragging: true, overlay: true })}</div> : null}
      </DragOverlay>
    </DndContext>
  )
}

/**
 * One column: the header (dot, title, count) over a scrolling list that is also a drop target,
 * so an empty column still takes cards. Usable on its own (e.g. a loading skeleton) — without
 * `droppableId` it is a plain column.
 */
export function KanbanColumn({
  title,
  color,
  count,
  isEmpty = false,
  emptyLabel,
  children,
  droppableId,
  bodyClassName,
  className,
}: {
  title: React.ReactNode
  color?: string | null
  count?: React.ReactNode
  /** No cards: `emptyLabel` shows in the body instead. */
  isEmpty?: boolean
  emptyLabel?: string
  children?: React.ReactNode
  /** The board's internal id for this column (KanbanBoard sets it). */
  droppableId?: string
  bodyClassName?: string
  className?: string
}) {
  const headingId = React.useId()
  const { setNodeRef } = useDroppable({ id: droppableId ?? headingId, disabled: droppableId === undefined })
  const valid = typeof color === 'string' && isHexColor(color)

  return (
    <section
      aria-labelledby={headingId}
      className={cn('flex min-w-72 flex-1 flex-col rounded-xl border border-border bg-muted', className)}
    >
      <header className="flex items-center gap-2 px-4 pt-4 pb-3">
        <span
          aria-hidden="true"
          className={cn('size-2.5 shrink-0 rounded-full', !valid && 'bg-neutral')}
          style={valid ? { backgroundColor: color } : undefined}
        />
        <h2 id={headingId} className="min-w-0 truncate text-title-row font-semibold">
          {title}
        </h2>
        {count !== undefined ? (
          <Badge tone="neutral" size="sm" outlined className="tabular-nums">
            {count}
          </Badge>
        ) : null}
      </header>
      <ul ref={setNodeRef} aria-labelledby={headingId} className={cn('flex min-h-24 flex-1 flex-col gap-3 overflow-y-auto px-3 pb-3', bodyClassName)}>
        {children}
        {isEmpty && emptyLabel ? (
          <li className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-border px-3 py-6 text-center text-body-sm text-muted-foreground">
            {emptyLabel}
          </li>
        ) : null}
      </ul>
    </section>
  )
}

/** Interactive elements inside a card: a drag never starts on them. */
const INTERACTIVE = 'button, a, input, textarea, select, label, [role="menuitem"], [data-no-drag]'

/** Pointer listeners that ignore presses on the card's own buttons and links. */
function cardListeners(listeners: DraggableSyntheticListeners): DraggableSyntheticListeners {
  if (!listeners) return listeners
  return Object.fromEntries(
    Object.entries(listeners).map(([name, handler]) => [
      name,
      (event: React.SyntheticEvent) => {
        const target = event.target instanceof Element ? event.target : null
        // React bubbles events from portals (an open menu of the card) through the card too.
        if (!target || !event.currentTarget.contains(target)) return
        const hit = target.closest(INTERACTIVE)
        if (hit && hit !== event.currentTarget && event.currentTarget.contains(hit)) return
        ;(handler as (event: React.SyntheticEvent) => void)(event)
      },
    ]),
  )
}

/**
 * The draggable card wrapper: the whole card is the activator (focusable, Space/Enter picks it
 * up). It names the card for screen readers; the card's own content stays reachable by Tab.
 */
export function KanbanCard({
  id,
  label,
  disabled,
  children,
}: {
  id: string
  label: string
  disabled: boolean
  children: (dragging: boolean) => React.ReactNode
}) {
  const t = useTranslations('shared.kanban')
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id, disabled })
  // The card is both the node and the activator: dnd-kit then ignores Space/Enter pressed on a
  // button inside it.
  const ref = React.useCallback(
    (element: HTMLLIElement | null) => {
      setNodeRef(element)
      setActivatorNodeRef(element)
    },
    [setNodeRef, setActivatorNodeRef],
  )

  return (
    <li
      ref={ref}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      aria-roledescription={disabled ? undefined : t('roleDescription')}
      aria-describedby={disabled ? undefined : attributes['aria-describedby']}
      {...(disabled ? {} : cardListeners(listeners))}
      aria-label={label}
      tabIndex={disabled ? undefined : 0}
      className={cn(
        'relative rounded-xl focus-visible:shadow-focus focus-visible:outline-none',
        !disabled && 'cursor-grab touch-manipulation',
        isDragging && 'z-10 opacity-disabled',
      )}
    >
      {children(isDragging)}
    </li>
  )
}
