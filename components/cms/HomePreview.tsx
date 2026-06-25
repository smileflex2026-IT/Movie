import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Sparkles, Crown, Heart, Play, Eye, Film, GripVertical } from "lucide-react";
import {
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Category,
  Movie,
  getMovies,
  getPlayCounts,
  getLastPlayed,
  rankTopTen,
} from "@/lib/cms-storage";
import { getFavorites, onFavoritesChange } from "@/lib/favorites";
import { getCachedRailSettings, RailSettings } from "@/lib/rail-settings";

/**
 * A faithful lightweight preview of the SmileFlex homepage rails.
 * Mirrors the resolution logic in `src/pages/Home.tsx` so editors can see
 * exactly how their reordering / category edits will land for viewers,
 * without the cost (or distraction) of rendering the full Home page.
 *
 * Pass `categories` from the parent so the preview reflects unsaved
 * in-flight changes (drag, inline edits) — the parent normalises orders
 * before it persists, so we just sort by `order` here.
 */
export interface HomePreviewProps {
  /** Ordered list of categories from the editor (already includes virtuals). */
  categories: Category[];
  /** Optional: highlight one rail (e.g. the row the editor just dropped). */
  highlightId?: string | null;
  /** How many posters to show per rail. */
  itemsPerRail?: number;
  /**
   * Optional reorder callback. When provided, rails become draggable inside
   * the preview and call this with the new ordered id list on drop.
   */
  onReorder?: (orderedIds: string[]) => void;
}

const MAX_ITEMS = 8;

function railIcon(c: Category) {
  if (c.virtual && c.slug === "favorites") return Heart;
  if (c.virtual && c.topTen) return Crown;
  if (c.virtual && c.slug === "continue") return Play;
  if (c.virtual) return Sparkles;
  return Film;
}

function railTone(c: Category) {
  if (c.virtual && c.slug === "favorites") return "text-pink-400";
  if (c.virtual && c.topTen) return "text-warning";
  if (c.virtual && c.slug === "continue") return "text-primary-glow";
  if (c.virtual) return "text-primary-glow";
  return "text-muted-foreground";
}

export default function HomePreview({ categories, highlightId, itemsPerRail = 6, onReorder }: HomePreviewProps) {
  const [movies, setMoviesState] = useState<Movie[]>([]);
  const [playCounts, setPlayCounts] = useState<Record<string, number>>({});
  const [lastPlayed, setLastPlayed] = useState<Record<string, number>>({});
  const [favorites, setFavorites] = useState<string[]>(getFavorites);
  const [settings] = useState<RailSettings>(getCachedRailSettings);
  // Preserve the rails scroll position across reorders / data refreshes so
  // editors don't get yanked back to the top after every drop.
  const railsScrollRef = useRef<HTMLDivElement | null>(null);
  const savedScrollTopRef = useRef<number>(0);

  // Capture scrollTop before each render so the layout effect below can
  // restore it after dnd-kit re-renders the rail list.
  if (typeof window !== "undefined" && railsScrollRef.current) {
    savedScrollTopRef.current = railsScrollRef.current.scrollTop;
  }

  useLayoutEffect(() => {
    const el = railsScrollRef.current;
    if (!el) return;
    const target = savedScrollTopRef.current;
    if (Math.abs(el.scrollTop - target) > 1) {
      el.scrollTop = target;
    }
  });

  // Mirror Home: refresh on storage events, focus, and favorites changes.
  useEffect(() => {
    const load = () => {
      setMoviesState(getMovies().filter((m) => m.published));
      setPlayCounts(getPlayCounts());
      setLastPlayed(getLastPlayed());
      setFavorites(getFavorites());
    };
    load();
    const onStorage = (e: StorageEvent) => {
      if (!e.key || e.key.startsWith("smileflex_")) load();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", load);
    const offFav = onFavoritesChange(() => setFavorites(getFavorites()));
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", load);
      offFav();
    };
  }, []);

  // Resolve each category to its visible movie list using the same rules Home uses.
  const rails = useMemo(() => {
    const sorted = [...categories].sort((a, b) => a.order - b.order);
    const favSet = new Set(favorites);
    const recencyOrder = (id: string) => lastPlayed[id] ?? 0;

    return sorted.map((cat) => {
      let items: Movie[] = [];
      let emptyHint = "";
      if (cat.virtual && cat.slug === "favorites") {
        items = favorites.map((id) => movies.find((m) => m.id === id)).filter((m): m is Movie => !!m);
        emptyHint = "Hidden until a viewer hearts a movie.";
      } else if (cat.virtual && cat.topTen) {
        items = rankTopTen(movies, playCounts, settings, lastPlayed);
        emptyHint = "Will populate as movies get plays or trending ranks.";
      } else if (cat.virtual && cat.slug === "continue") {
        const played = movies.filter((m) => playCounts[m.id]);
        items = played
          .sort((a, b) =>
            settings.continueSort === "most_played"
              ? (playCounts[b.id] || 0) - (playCounts[a.id] || 0)
              : recencyOrder(b.id) - recencyOrder(a.id),
          )
          .slice(0, settings.continueMaxItems);
        emptyHint = "Hidden until a viewer starts watching something.";
      } else {
        items = movies.filter((m) => m.categoryId === cat.id);
        if (!items.length) emptyHint = "No movies assigned to this category yet.";
      }
      return {
        cat,
        items: items.slice(0, Math.min(itemsPerRail, MAX_ITEMS)),
        totalCount: items.length,
        emptyHint,
        favSet,
      };
    });
  }, [categories, movies, playCounts, lastPlayed, favorites, settings, itemsPerRail]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!onReorder || !over || active.id === over.id) return;
    const sorted = [...categories].sort((a, b) => a.order - b.order);
    const ids = sorted.map((c) => c.id);
    const oldIndex = ids.indexOf(String(active.id));
    const newIndex = ids.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    const next = [...ids];
    const [moved] = next.splice(oldIndex, 1);
    next.splice(newIndex, 0, moved);
    onReorder(next);
  };

  const draggable = !!onReorder;

  return (
    <div className="rounded-2xl border border-border bg-[#0b0b0f] overflow-hidden shadow-elegant">
      {/* Faux Home top bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-gradient-to-b from-black/60 to-black/0">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-destructive/80" />
          <div className="w-2 h-2 rounded-full bg-warning/80" />
          <div className="w-2 h-2 rounded-full bg-success/80" />
          <span className="ml-3 text-[10px] uppercase tracking-[0.18em] text-muted-foreground flex items-center gap-1.5">
            <Eye className="w-3 h-3" /> Live home preview{draggable ? " · drag to reorder" : ""}
          </span>
        </div>
        <span className="text-[10px] text-muted-foreground">{rails.length} rails</span>
      </div>

      {/* Faux hero strip */}
      <div className="relative h-24 bg-gradient-to-br from-primary/30 via-secondary to-background border-b border-white/5 px-4 flex flex-col justify-end pb-3">
        <div className="text-xs font-semibold text-foreground/90">Featured Hero</div>
        <div className="text-[10px] text-muted-foreground">Carousel preview placeholder</div>
      </div>

      {/* Rails */}
      <div ref={railsScrollRef} className="p-3 space-y-4 max-h-[640px] overflow-y-auto">
        {rails.length === 0 && (
          <div className="text-center py-12 text-xs text-muted-foreground">
            Add a category to see how it appears on the homepage.
          </div>
        )}
        {draggable ? (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={rails.map((r) => r.cat.id)} strategy={verticalListSortingStrategy}>
              {rails.map((r) => (
                <SortableRail key={r.cat.id} {...r} highlightId={highlightId} draggable />
              ))}
            </SortableContext>
          </DndContext>
        ) : (
          rails.map((r) => (
            <SortableRail key={r.cat.id} {...r} highlightId={highlightId} draggable={false} />
          ))
        )}
      </div>
    </div>
  );
}

interface RailRowProps {
  cat: Category;
  items: Movie[];
  totalCount: number;
  emptyHint: string;
  favSet: Set<string>;
  highlightId?: string | null;
  draggable: boolean;
}

function SortableRail({ cat, items, totalCount, emptyHint, favSet, highlightId, draggable }: RailRowProps) {
  const sortable = useSortable({ id: cat.id, disabled: !draggable });
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = sortable;
  const style = draggable
    ? { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.55 : 1 }
    : undefined;
  const Icon = railIcon(cat);
  const tone = railTone(cat);
  const isHighlight = highlightId === cat.id;
  return (
    <section
      ref={draggable ? setNodeRef : undefined}
      style={style}
      className={`rounded-xl px-2 py-2 transition-all ${
        isHighlight
          ? "ring-2 ring-primary/60 bg-primary/5 shadow-glow"
          : isDragging
          ? "bg-secondary/40 ring-1 ring-primary/40"
          : "bg-transparent"
      }`}
      aria-label={`Preview rail: ${cat.name}`}
    >
      <header className="flex items-center justify-between mb-2 px-1">
        <div className="flex items-center gap-2 min-w-0">
          {draggable && (
            <button
              type="button"
              aria-label={`Drag to reorder ${cat.name}`}
              {...attributes}
              {...listeners}
              className="p-0.5 rounded text-muted-foreground hover:text-foreground hover:bg-secondary/60 cursor-grab active:cursor-grabbing touch-none shrink-0"
            >
              <GripVertical className="w-3.5 h-3.5" />
            </button>
          )}
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-secondary/60 text-muted-foreground tabular-nums shrink-0">
            {cat.order}
          </span>
          <Icon className={`w-3.5 h-3.5 shrink-0 ${tone}`} />
          <h4 className="text-sm font-semibold truncate">{cat.name}</h4>
        </div>
        <span className="text-[10px] text-muted-foreground shrink-0">
          {totalCount} {totalCount === 1 ? "item" : "items"}
        </span>
      </header>

      {items.length === 0 ? (
        <div className="text-[11px] text-muted-foreground italic px-1 py-3 rounded-lg bg-secondary/20 border border-dashed border-border">
          {emptyHint || "Empty rail."}
        </div>
      ) : (
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 snap-x">
          {items.map((m, i) => (
            <div key={m.id} className="relative shrink-0 snap-start" title={m.title}>
              <div
                className={`overflow-hidden rounded-md border border-white/5 bg-secondary ${
                  cat.topTen ? "w-20 h-12" : "w-16 h-24"
                }`}
              >
                {m.poster ? (
                  <img
                    src={cat.topTen ? m.backdrop || m.poster : m.poster}
                    alt={m.title}
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    <Film className="w-3 h-3" />
                  </div>
                )}
              </div>
              {cat.topTen && (
                <span className="absolute -top-1 -left-1 text-[10px] font-bold w-4 h-4 rounded-full bg-warning text-background flex items-center justify-center">
                  {i + 1}
                </span>
              )}
              {cat.virtual && cat.slug === "favorites" && favSet.has(m.id) && (
                <Heart className="absolute -top-1 -right-1 w-3 h-3 text-pink-400 fill-pink-400" />
              )}
            </div>
          ))}
          {totalCount > items.length && (
            <div className="shrink-0 self-center text-[10px] text-muted-foreground pl-1">
              +{totalCount - items.length}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
