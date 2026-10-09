'use client'

import * as React from 'react'
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type DragStartEvent,
  type DraggableAttributes,
  type DraggableSyntheticListeners,
  type Modifier,
  type UniqueIdentifier,
} from '@dnd-kit/core'
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/cn'

/* A vertical list the user reorders by dragging (dnd-kit, CLAUDE.md §2) — generic: it knows
   nothing about what it lists.
   - Only the handle drags (render <DragHandle label="…" /> anywhere inside an item — it finds its
     item through context), so everything else in an item — buttons, links — stays clickable.
   - Pointer (mouse, pen, touch — the handle sets `touch-action: none`) after a 4px move, and
     keyboard: focus a handle, Space/Enter picks the item up, ↑/↓ move it, Space/Enter drops,
     Escape cancels. Screen readers hear dnd-kit's live announcements, in our words.
   - While dragging, the item stays in place at `opacity-disabled` and a copy follows the
     pointer in a DragOverlay (`shadow-lg`); movement is locked to the vertical axis.
   - On drop, `onReorder(ids)` gets every id in the new order. The list shows that order at once
     and keeps it until `items` changes (the caller's optimistic update, or a refetch).
   - `disabled`: nothing drags; handles are inert (e.g. while the list is filtered). */

type SortableHandle = {
  attributes: DraggableAttributes
  listeners: DraggableSyntheticListeners
  setActivatorNodeRef: (element: HTMLElement | null) => void
  disabled: boolean
  /** True on the copy that follows the pointer. */
  overlay: boolean
}

export type SortableListProps<T, Id extends UniqueIdentifier> = {
  items: ReadonlyArray<T>
  getId: (item: T) => Id
  /** How an item is named in announcements ("To Do"). */
  getLabel: (item: T) => string
  renderItem: (item: T, state: { dragging: boolean; overlay: boolean }) => React.ReactNode
  onReorder: (orderedIds: Id[]) => void
  disabled?: boolean
  /** The list's accessible name. */
  label: string
  className?: string
}

/** Keeps movement on the vertical axis (no extra package needed for this one modifier). */
const verticalOnly: Modifier = ({ transform }) => ({ ...transform, x: 0 })

export function SortableList<T, Id extends UniqueIdentifier>({
  items,
  getId,
  getLabel,
  renderItem,
  onReorder,
  disabled = false,
  label,
  className,
}: SortableListProps<T, Id>) {
  const t = useTranslations('shared.sortable')
  // A stable id for dnd-kit's accessibility nodes: its own counter differs between the server
  // render and the browser, which left every handle's aria-describedby pointing at nothing.
  const dndId = React.useId()
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  // The order shown: the last drop's, until the caller's `items` catch up (a new array).
  const [dropped, setDropped] = React.useState<{ for: ReadonlyArray<T>; ids: Id[] } | null>(null)
  const ids = React.useMemo(() => {
    const fromItems = items.map(getId)
    return dropped && dropped.for === items ? dropped.ids : fromItems
  }, [items, getId, dropped])
  const byId = React.useMemo(() => new Map(items.map((item) => [getId(item), item])), [items, getId])
  const ordered = ids.map((id) => byId.get(id)).filter((item): item is T => item !== undefined)

  const [activeId, setActiveId] = React.useState<Id | null>(null)
  const active = activeId === null ? undefined : byId.get(activeId)

  const nameOf = (id: UniqueIdentifier) => {
    const item = byId.get(id as Id)
    return item ? getLabel(item) : String(id)
  }
  const positionOf = (id: UniqueIdentifier | undefined) => (id === undefined ? 0 : ids.indexOf(id as Id) + 1)

  const announcements: Announcements = {
    onDragStart: ({ active: a }) => t('pickedUp', { item: nameOf(a.id), position: positionOf(a.id), total: ids.length }),
    onDragOver: ({ active: a, over }) => (over ? t('movedOver', { item: nameOf(a.id), position: positionOf(over.id), total: ids.length }) : undefined),
    onDragEnd: ({ active: a, over }) =>
      over ? t('dropped', { item: nameOf(a.id), position: positionOf(over.id), total: ids.length }) : t('cancelled', { item: nameOf(a.id) }),
    onDragCancel: ({ active: a }) => t('cancelled', { item: nameOf(a.id) }),
  }

  const onDragStart = (event: DragStartEvent) => setActiveId(event.active.id as Id)
  const onDragEnd = (event: DragEndEvent) => {
    setActiveId(null)
    const { active: a, over } = event
    if (!over || a.id === over.id) return
    const next = arrayMove(ids, ids.indexOf(a.id as Id), ids.indexOf(over.id as Id))
    setDropped({ for: items, ids: next })
    onReorder(next)
  }

  return (
    <DndContext
      id={dndId}
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[verticalOnly]}
      accessibility={{ announcements, screenReaderInstructions: { draggable: t('instructions') } }}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <SortableContext items={ids} strategy={verticalListSortingStrategy} disabled={disabled}>
        <ul aria-label={label} className={cn('flex flex-col', className)}>
          {ordered.map((item) => (
            <SortableItem key={getId(item)} id={getId(item)} disabled={disabled}>
              {(dragging) => renderItem(item, { dragging, overlay: false })}
            </SortableItem>
          ))}
        </ul>
      </SortableContext>
      <DragOverlay>
        {active ? (
          <HandleContext.Provider value={OVERLAY_HANDLE}>
            <div className="rounded-xl shadow-lg">{renderItem(active, { dragging: true, overlay: true })}</div>
          </HandleContext.Provider>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}

/** The copy under the pointer: its handle looks the same but does nothing. */
const OVERLAY_HANDLE: SortableHandle = {
  attributes: { role: 'button', tabIndex: -1, 'aria-disabled': true, 'aria-pressed': undefined, 'aria-roledescription': 'sortable', 'aria-describedby': '' },
  listeners: undefined,
  setActivatorNodeRef: () => {},
  disabled: true,
  overlay: true,
}

function SortableItem({
  id,
  disabled,
  children,
}: {
  id: UniqueIdentifier
  disabled: boolean
  children: (dragging: boolean) => React.ReactNode
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id, disabled })

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn('relative', isDragging && 'z-10 opacity-disabled')}
    >
      <HandleContext.Provider value={{ attributes, listeners, setActivatorNodeRef, disabled, overlay: false }}>
        {children(isDragging)}
      </HandleContext.Provider>
    </li>
  )
}

/** What a DragHandle needs from its item (set by SortableItem / the overlay). */
const HandleContext = React.createContext<SortableHandle | null>(null)

/**
 * The six-dot grip that drags its item — a ghost icon button (`icon-size`, `muted-foreground`,
 * `foreground` on hover, the focus ring) that is the only drag activator. `label` names what it
 * moves ("Reorder To Do").
 */
export function DragHandle({ label, className }: { label: string; className?: string }) {
  const context = React.useContext(HandleContext)
  if (!context) throw new Error('DragHandle must be rendered inside a SortableList item.')
  const { attributes, listeners, setActivatorNodeRef, disabled, overlay } = context

  return (
    <button
      type="button"
      ref={setActivatorNodeRef}
      {...attributes}
      {...(disabled ? {} : listeners)}
      aria-label={label}
      aria-disabled={disabled || undefined}
      tabIndex={overlay ? -1 : attributes.tabIndex}
      className={cn(
        'inline-flex size-control-sm shrink-0 touch-none items-center justify-center rounded-lg text-muted-foreground transition-colors',
        'focus-visible:border focus-visible:border-ring focus-visible:shadow-focus focus-visible:outline-none',
        disabled ? 'cursor-not-allowed opacity-disabled' : 'cursor-grab hover:bg-accent hover:text-foreground active:cursor-grabbing',
        className,
      )}
    >
      <GripVertical className="size-icon" aria-hidden="true" />
    </button>
  )
}
