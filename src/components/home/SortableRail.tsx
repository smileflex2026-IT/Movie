import { HTMLAttributes, ReactNode, useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  DragOverEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { DraggableAttributes } from "@dnd-kit/core";
import type { SyntheticListenerMap } from "@dnd-kit/core/dist/hooks/utilities";
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

export interface DragHandleProps {
  ref: (el: HTMLElement | null) => void;
  attributes: DraggableAttributes | HTMLAttributes<HTMLElement>;
  listeners: SyntheticListenerMap | undefined;
  isDragging: boolean;
  /** True when this item is the current drop target (hovered during drag). */
  isOver?: boolean;
  /** Which side of this item the dragged item will land on. */
  insertionSide?: "left" | "right" | null;
}

/**
 * Generic horizontal sortable rail. Reused by every rail on the home page so
 * the drag UX (sensor distance, keyboard support, overlay) stays identical.
 *
 * The caller supplies:
 *   - `items` — list to render in the desired starting order
 *   - `getId` — stable id per item
 *   - `renderItem(item, handle, style)` — draws each item; spread `handle` on
 *     the element that should initiate dragging
 *   - `onReorder(newIds)` — fired with the full reordered id list on drop
 *   - `containerClassName` — the flex/scroll container class for the items
 */
export function SortableRail<T>({
  items,
  getId,
  renderItem,
  onReorder,
  containerClassName,
}: {
  items: T[];
  getId: (item: T) => string;
  renderItem: (
    item: T,
    handle: DragHandleProps,
    style: React.CSSProperties,
  ) => ReactNode;
  onReorder: (newIds: string[]) => void;
  containerClassName: string;
}) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const sensors = useSensors(
    // 6px before drag kicks in so taps/clicks still fire normally.
    // On touch devices a short delay + tolerance gives the placeholder
    // animation room to feel intentional rather than jumpy.
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6, delay: 120, tolerance: 8 },
    }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const ids = items.map(getId);

  const onDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id));
  const onDragOver = (e: DragOverEvent) => {
    setOverId(e.over ? String(e.over.id) : null);
  };
  const onDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    setOverId(null);
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = ids.indexOf(String(active.id));
    const newIndex = ids.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    onReorder(arrayMove(ids, oldIndex, newIndex));
  };

  const activeItem = activeId
    ? items.find((i) => getId(i) === activeId) ?? null
    : null;

  // Compute which side of the hovered card the placeholder line sits on.
  // If dragging from the left, the item lands AFTER the target (right side);
  // if from the right, it lands BEFORE the target (left side).
  const activeIndex = activeId ? ids.indexOf(activeId) : -1;
  const overIndex = overId ? ids.indexOf(overId) : -1;
  const insertionSide: "left" | "right" | null =
    activeId && overId && activeId !== overId && activeIndex >= 0 && overIndex >= 0
      ? activeIndex < overIndex
        ? "right"
        : "left"
      : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onDragCancel={() => {
        setActiveId(null);
        setOverId(null);
      }}
    >
      <SortableContext items={ids} strategy={horizontalListSortingStrategy}>
        <div className={containerClassName}>
          {items.map((item) => (
            <SortableItem
              key={getId(item)}
              id={getId(item)}
              item={item}
              renderItem={renderItem}
              isOver={overId === getId(item) && activeId !== getId(item)}
              insertionSide={overId === getId(item) ? insertionSide : null}
            />
          ))}
        </div>
      </SortableContext>
      <DragOverlay
        dropAnimation={{
          duration: 220,
          easing: "cubic-bezier(0.2, 0, 0, 1)",
        }}
      >
        {activeItem
          ? renderItem(
              activeItem,
              {
                ref: () => undefined,
                attributes: {} as HTMLAttributes<HTMLElement>,
                listeners: undefined,
                isDragging: true,
                isOver: false,
                insertionSide: null,
              },
              {
                cursor: "grabbing",
                opacity: 0.95,
                transform: "scale(1.04)",
                boxShadow: "0 18px 40px rgba(0,0,0,0.55)",
                transition: "transform 180ms cubic-bezier(0.2, 0, 0, 1)",
              },
            )
          : null}
      </DragOverlay>
    </DndContext>
  );
}

function SortableItem<T>({
  id,
  item,
  renderItem,
  isOver,
  insertionSide,
}: {
  id: string;
  item: T;
  renderItem: (
    item: T,
    handle: DragHandleProps,
    style: React.CSSProperties,
  ) => ReactNode;
  isOver: boolean;
  insertionSide: "left" | "right" | null;
}) {
  const {
    setNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    // Smooth slide for siblings shifting around the dragged item. dnd-kit
    // supplies a transition string while sorting; we override it with a
    // slightly longer easing so the gap-fill feels fluid on touch.
    transition: transition
      ? "transform 220ms cubic-bezier(0.2, 0, 0, 1)"
      : undefined,
    // Hide the original while it's being dragged — DragOverlay shows it instead.
    opacity: isDragging ? 0 : 1,
    // Keep the placeholder gap reserved while dragging so neighbours slide
    // into a real slot rather than collapsing first.
    willChange: "transform",
    position: "relative",
  };

  return (
    <>
      {renderItem(
        item,
        { ref: setNodeRef, attributes, listeners, isDragging, isOver, insertionSide },
        style,
      )}
    </>
  );
}
