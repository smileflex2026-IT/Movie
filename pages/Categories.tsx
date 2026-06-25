import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Trash2, Tag, Edit2, ArrowUp, ArrowDown, Sliders, Sparkles, GripVertical, Eye } from "lucide-react";
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
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import DashboardLayout from "@/components/cms/DashboardLayout";
import Modal from "@/components/cms/Modal";
import { Field, inputCls } from "@/components/cms/FormField";
import HomePreview from "@/components/cms/HomePreview";
import { Category, getCategories, setCategories, generateId } from "@/lib/cms-storage";
import { pushCategoryOrder, pullCategoryOrder } from "@/lib/cloud-category-order";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** Force orders to be a clean 1..N sequence in the current display order. */
const normalizeOrders = (list: Category[]): Category[] =>
  list.map((c, i) => ({ ...c, order: i + 1 }));

function SortableRow({
  c,
  onMove,
  onOrderInput,
  onEdit,
  onRemove,
  total,
}: {
  c: Category;
  onMove: (id: string, dir: -1 | 1) => void;
  onOrderInput: (id: string, newOrder: number) => void;
  onEdit: (c: Category) => void;
  onRemove: (id: string) => void;
  total: number;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: c.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={`border-t border-border hover:bg-secondary/30 transition-colors ${isDragging ? "bg-secondary/40" : ""}`}
    >
      <td className="px-3 py-4 w-10">
        <button
          type="button"
          aria-label={`Drag to reorder ${c.name}`}
          {...attributes}
          {...listeners}
          className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-secondary cursor-grab active:cursor-grabbing touch-none"
        >
          <GripVertical className="w-4 h-4" />
        </button>
      </td>
      <td className="px-4 py-4">
        <div className="flex items-center gap-1">
          <button
            onClick={() => onMove(c.id, -1)}
            aria-label="Move up"
            className="p-1.5 rounded bg-secondary/60 hover:bg-secondary disabled:opacity-30 disabled:cursor-not-allowed"
            disabled={c.order <= 1}
          >
            <ArrowUp className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onMove(c.id, 1)}
            aria-label="Move down"
            className="p-1.5 rounded bg-secondary/60 hover:bg-secondary disabled:opacity-30 disabled:cursor-not-allowed"
            disabled={c.order >= total}
          >
            <ArrowDown className="w-3.5 h-3.5" />
          </button>
          <input
            type="number"
            min={1}
            max={total}
            value={c.order}
            onChange={(e) => onOrderInput(c.id, parseInt(e.target.value, 10))}
            aria-label={`Order for ${c.name}`}
            className="ml-2 w-14 px-2 py-1 text-xs rounded bg-secondary/40 border border-border focus:border-primary focus:outline-none tabular-nums"
          />
        </div>
      </td>
      <td className="px-6 py-4 font-medium">{c.name}</td>
      <td className="px-6 py-4 text-muted-foreground font-mono text-sm">{c.slug}</td>
      <td className="px-6 py-4">
        {c.virtual ? (
          <span className="inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-md bg-primary/15 text-primary-glow">
            <Sparkles className="w-3 h-3" /> Virtual
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">Static</span>
        )}
        {c.topTen && (
          <span className="ml-1.5 inline-flex items-center text-xs px-2 py-1 rounded-md bg-warning/15 text-warning">
            Top 10
          </span>
        )}
      </td>
      <td className="px-6 py-4 text-right space-x-2">
        <button onClick={() => onEdit(c)} className="p-2 rounded-lg bg-secondary hover:bg-secondary/70 inline-flex">
          <Edit2 className="w-4 h-4" />
        </button>
        <button onClick={() => onRemove(c.id)} className="p-2 rounded-lg bg-destructive/20 hover:bg-destructive text-destructive hover:text-destructive-foreground transition-colors">
          <Trash2 className="w-4 h-4" />
        </button>
      </td>
    </tr>
  );
}

export default function CategoriesPage() {
  const [list, setList] = useState<Category[]>([]);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [topTen, setTopTen] = useState(false);
  const [virtual, setVirtual] = useState(false);
  // The rail most recently touched (drag, edit, add) — flashed in the preview.
  const [highlightId, setHighlightId] = useState<string | null>(null);
  // Allow editors to collapse the preview on smaller screens.
  const [previewOpen, setPreviewOpen] = useState(true);
  // Wrapper around the table so we can preserve its scroll position across
  // reorders (in case it overflows horizontally on smaller screens).
  const tableScrollRef = useRef<HTMLDivElement | null>(null);
  const { user } = useAuth();
  const [syncState, setSyncState] = useState<"idle" | "syncing" | "synced" | "error">("idle");

  /** Briefly mark a rail as "just changed" so the preview pulses it. */
  const flashHighlight = (id: string | null) => {
    setHighlightId(id);
    if (id) {
      window.setTimeout(() => {
        setHighlightId((cur) => (cur === id ? null : cur));
      }, 1400);
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const refresh = () => setList([...getCategories()].sort((a, b) => a.order - b.order));
  useEffect(refresh, []);

  // On mount / when the signed-in account changes, pull this account's saved
  // order from the cloud so a fresh device shows the same rail layout.
  useEffect(() => {
    if (!user?.email) return;
    let cancelled = false;
    setSyncState("syncing");
    pullCategoryOrder(user.email)
      .then((applied) => {
        if (cancelled) return;
        if (applied) refresh();
        setSyncState("synced");
      })
      .catch(() => !cancelled && setSyncState("error"));
    return () => {
      cancelled = true;
    };
  }, [user?.email]);

  /** Persist a new ordered list, normalizing orders to 1..N. */
  const persist = (next: Category[]) => {
    // Snapshot scroll positions BEFORE React re-renders so we can restore
    // them after the DOM updates. Without this, dnd-kit re-renders + the
    // synthetic storage event can nudge the page back to the top.
    const winY = typeof window !== "undefined" ? window.scrollY : 0;
    const winX = typeof window !== "undefined" ? window.scrollX : 0;
    const tableLeft = tableScrollRef.current?.scrollLeft ?? 0;
    const tableTop = tableScrollRef.current?.scrollTop ?? 0;

    const normalized = normalizeOrders(next);
    setCategories(normalized);
    setList(normalized);
    // Same-tab listeners (e.g. an open Home tab in this window) don't get the
    // browser's cross-tab `storage` event. Dispatch a synthetic one so the
    // homepage rail order refreshes instantly.
    try {
      window.dispatchEvent(new StorageEvent("storage", { key: "smileflex_categories" }));
    } catch {
      window.dispatchEvent(new Event("storage"));
    }

    // Restore on the next two frames — once for the React commit, once more
    // to win against any late layout shifts (sticky preview, toast mount).
    const restore = () => {
      window.scrollTo(winX, winY);
      if (tableScrollRef.current) {
        tableScrollRef.current.scrollLeft = tableLeft;
        tableScrollRef.current.scrollTop = tableTop;
      }
    };
    requestAnimationFrame(() => {
      restore();
      requestAnimationFrame(restore);
    });

    // Mirror the new order up to the cloud for this account (fire-and-forget).
    if (user?.email) {
      setSyncState("syncing");
      pushCategoryOrder(user.email, normalized.map((c) => c.id))
        .then(() => setSyncState("synced"))
        .catch(() => setSyncState("error"));
    }
  };

  const openNew = () => { setEditingId(null); setName(""); setSlug(""); setTopTen(false); setVirtual(false); setOpen(true); };
  const openEdit = (c: Category) => { setEditingId(c.id); setName(c.name); setSlug(c.slug); setTopTen(!!c.topTen); setVirtual(!!c.virtual); setOpen(true); };

  const save = () => {
    if (!name.trim() || !slug.trim()) return toast.error("Name and slug are required");
    const all = getCategories();
    let touchedId: string | null = editingId;
    if (editingId) {
      const i = all.findIndex((c) => c.id === editingId);
      if (i !== -1) all[i] = { ...all[i], name: name.trim(), slug: slug.trim(), topTen, virtual };
    } else {
      const maxOrder = all.reduce((m, c) => Math.max(m, c.order || 0), 0);
      const newId = generateId();
      touchedId = newId;
      all.push({ id: newId, name: name.trim(), slug: slug.trim(), order: maxOrder + 1, topTen, virtual });
    }
    const sorted = [...all].sort((a, b) => a.order - b.order);
    persist(sorted);
    flashHighlight(touchedId);
    setOpen(false); setName(""); setSlug(""); setTopTen(false); setVirtual(false); setEditingId(null);
    toast.success(editingId ? "Category updated" : "Category created");
  };

  const remove = (id: string) => {
    if (!confirm("Delete this category?")) return;
    const next = getCategories().filter((c) => c.id !== id).sort((a, b) => a.order - b.order);
    persist(next);
    toast.success("Category deleted");
  };

  const move = (id: string, dir: -1 | 1) => {
    const sorted = [...list];
    const i = sorted.findIndex((c) => c.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= sorted.length) return;
    persist(arrayMove(sorted, i, j));
    flashHighlight(id);
  };

  /** Set a row to an explicit order value via the inline input. */
  const setOrderInput = (id: string, newOrder: number) => {
    if (!Number.isFinite(newOrder)) return;
    const sorted = [...list];
    const i = sorted.findIndex((c) => c.id === id);
    if (i < 0) return;
    const target = Math.max(1, Math.min(sorted.length, Math.floor(newOrder))) - 1;
    if (target === i) return;
    persist(arrayMove(sorted, i, target));
    flashHighlight(id);
  };

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = list.findIndex((c) => c.id === active.id);
    const newIndex = list.findIndex((c) => c.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    persist(arrayMove(list, oldIndex, newIndex));
    flashHighlight(String(active.id));
    toast.success("Order updated — homepage will refresh");
  };

  /** Reorder triggered from inside the HomePreview pane. */
  const onPreviewReorder = (orderedIds: string[]) => {
    const byId = new Map(list.map((c) => [c.id, c] as const));
    const next = orderedIds.map((id) => byId.get(id)).filter((c): c is Category => !!c);
    if (next.length !== list.length) return;
    // Identify which rail moved relative to the previous order, for the flash.
    const movedId = orderedIds.find((id, i) => list[i]?.id !== id) ?? null;
    persist(next);
    if (movedId) flashHighlight(movedId);
    toast.success("Order updated — homepage will refresh");
  };

  return (
    <DashboardLayout>
      <header className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Categories</h1>
          <p className="text-muted-foreground mt-1">Drag rows to reorder, type a position, or use the arrows — the SmileFlex homepage updates instantly</p>
          {user?.email && (
            <p className="mt-2 text-xs flex items-center gap-2">
              <span
                className={
                  "inline-block w-1.5 h-1.5 rounded-full " +
                  (syncState === "synced"
                    ? "bg-success"
                    : syncState === "syncing"
                    ? "bg-warning animate-pulse"
                    : syncState === "error"
                    ? "bg-destructive"
                    : "bg-muted-foreground/50")
                }
              />
              <span className="text-muted-foreground">
                {syncState === "syncing"
                  ? "Syncing order to your account…"
                  : syncState === "error"
                  ? "Cloud sync failed — changes saved locally"
                  : syncState === "synced"
                  ? `Synced to ${user.email} — will follow you on next sign-in`
                  : `Sync ready for ${user.email}`}
              </span>
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setPreviewOpen((v) => !v)}
            className="px-4 py-2.5 rounded-xl bg-secondary hover:bg-secondary/70 font-medium flex items-center gap-2 transition-colors xl:hidden"
            aria-pressed={previewOpen}
          >
            <Eye className="w-4 h-4" /> {previewOpen ? "Hide" : "Show"} preview
          </button>
          <Link
            to="/cms/rails"
            className="px-4 py-2.5 rounded-xl bg-secondary hover:bg-secondary/70 font-medium flex items-center gap-2 transition-colors"
          >
            <Sliders className="w-4 h-4" /> Rail Settings
          </Link>
          <button onClick={openNew} className="px-5 py-2.5 rounded-xl gradient-brand text-primary-foreground font-semibold flex items-center gap-2 hover:shadow-glow hover:-translate-y-0.5 transition-all">
            <Plus className="w-4 h-4" /> Add Category
          </button>
        </div>
      </header>

      <div className="grid xl:grid-cols-[minmax(0,1fr)_360px] gap-6 items-start">
        <div ref={tableScrollRef} className="gradient-card border border-border rounded-2xl overflow-auto min-w-0">
        <table className="w-full">
          <thead className="bg-secondary/50">
            <tr className="text-left text-sm text-muted-foreground">
              <th className="px-3 py-4 font-medium w-10" aria-label="Drag handle" />
              <th className="px-6 py-4 font-medium w-24">Order</th>
              <th className="px-6 py-4 font-medium">Name</th>
              <th className="px-6 py-4 font-medium">Slug</th>
              <th className="px-6 py-4 font-medium">Type</th>
              <th className="px-6 py-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={list.map((c) => c.id)} strategy={verticalListSortingStrategy}>
              <tbody>
                {list.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-12 text-muted-foreground"><Tag className="w-10 h-10 mx-auto mb-3 opacity-30" />No categories yet</td></tr>
                ) : list.map((c) => (
                  <SortableRow
                    key={c.id}
                    c={c}
                    total={list.length}
                    onMove={move}
                    onOrderInput={setOrderInput}
                    onEdit={openEdit}
                    onRemove={remove}
                  />
                ))}
              </tbody>
            </SortableContext>
          </DndContext>
        </table>
        </div>

        {/* Live home preview — sticky on xl, collapsible below xl */}
        {(previewOpen || typeof window === "undefined") && (
          <aside className="xl:sticky xl:top-6">
            <HomePreview
              categories={list}
              highlightId={highlightId}
              itemsPerRail={6}
              onReorder={onPreviewReorder}
            />
          </aside>
        )}
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editingId ? "Edit Category" : "Add Category"}
        maxWidth="max-w-md"
        footer={
          <>
            <button onClick={() => setOpen(false)} className="px-5 py-2.5 rounded-xl bg-secondary hover:bg-secondary/70 font-medium transition-colors">Cancel</button>
            <button onClick={save} className="px-5 py-2.5 rounded-xl gradient-brand text-primary-foreground font-semibold hover:shadow-glow transition-all">Save Category</button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Name">
            <input className={inputCls} value={name} onChange={(e) => { setName(e.target.value); setSlug(slugify(e.target.value)); }} />
          </Field>
          <Field label="Slug"><input className={inputCls} value={slug} onChange={(e) => setSlug(e.target.value)} /></Field>
          <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg bg-secondary/40 hover:bg-secondary/60 transition-colors">
            <input
              type="checkbox"
              checked={topTen}
              onChange={(e) => setTopTen(e.target.checked)}
              className="w-4 h-4 mt-0.5 accent-primary"
            />
            <div>
              <div className="text-sm font-medium">Render as Top 10 row</div>
              <div className="text-xs text-muted-foreground">Big numbered posters. Sorted by Weekly Trending Rank, then play count.</div>
            </div>
          </label>
          <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg bg-secondary/40 hover:bg-secondary/60 transition-colors">
            <input
              type="checkbox"
              checked={virtual}
              onChange={(e) => setVirtual(e.target.checked)}
              className="w-4 h-4 mt-0.5 accent-primary"
            />
            <div>
              <div className="text-sm font-medium flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-primary-glow" /> Virtual rail
              </div>
              <div className="text-xs text-muted-foreground">
                Items are computed at runtime instead of using assigned movies. Top 10 ranks across all movies; Continue Watching uses each viewer's history. Tune the rules in <Link to="/cms/rails" className="underline">Rail Settings</Link>.
              </div>
            </div>
          </label>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
