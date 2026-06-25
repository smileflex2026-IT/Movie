import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Edit2, Trash2, Clock, Tag, Megaphone, Sparkles, Film, QrCode, Bot, Search, AlertTriangle, X, Upload, Layers } from "lucide-react";
import DashboardLayout from "@/components/cms/DashboardLayout";
import Modal from "@/components/cms/Modal";
import QrModal from "@/components/cms/QrModal";
import AIAssistantPanel from "@/components/cms/AIAssistantPanel";
import BulkImportModal from "@/components/cms/BulkImportModal";
import { Field, inputCls } from "@/components/cms/FormField";
import { Movie, Ad, AdType, getMovies, setMovies, getCategories, generateId, Category, makeUniqueSlug } from "@/lib/cms-storage";
import { slugify } from "@/lib/slug";
import { findSimilar, similarity } from "@/lib/similarity";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { getMediaBase, setMediaBase, resolveMediaUrl, isLocalRelative, DEFAULT_MEDIA_BASE } from "@/lib/media-source";
import { FolderOpen, HardDrive } from "lucide-react";
import DropUpload from "@/components/cms/DropUpload";

const empty = (): Movie => ({
  id: "",
  title: "",
  slug: "",
  description: "",
  poster: "",
  backdrop: "",
  video: "",
  duration: 0,
  categoryId: "",
  published: false,
  ads: [],
  createdAt: "",
  year: new Date().getFullYear(),
  rating: 0,
  featured: false,
  badge: "",
  weeklyTrendingRank: undefined,
});

export default function MoviesPage() {
  const { isAdmin } = useAuth();
  const [movies, setMoviesState] = useState<Movie[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Movie>(empty());
  const [aiLoading, setAiLoading] = useState(false);
  const [qrFor, setQrFor] = useState<Movie | null>(null);
  const [aiOpen, setAiOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const [mediaBase, setMediaBaseState] = useState<string>(getMediaBase());
  const videoFileRef = useRef<HTMLInputElement | null>(null);

  const watchUrl = (m: Movie) => `${window.location.origin}/watch/${m.slug || slugify(m.title) || m.id}`;

  // Keep the local-base input in sync if changed elsewhere (e.g. another tab).
  useEffect(() => {
    const onChange = () => setMediaBaseState(getMediaBase());
    window.addEventListener("smileflex:media-base", onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener("smileflex:media-base", onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  const commitMediaBase = (v: string) => {
    setMediaBaseState(v);
    setMediaBase(v);
  };

  const refresh = () => {
    setMoviesState(getMovies());
    setCategories(getCategories());
  };
  useEffect(refresh, []);

  // Filter the catalog by title/description/category match, ranked by similarity for fuzzy matches.
  const filteredMovies = useMemo(() => {
    const q = query.trim();
    if (!q) return movies;
    const ql = q.toLowerCase();
    return movies
      .map((m) => {
        const cat = categories.find((c) => c.id === m.categoryId)?.name || "";
        const haystack = `${m.title} ${m.description} ${cat}`.toLowerCase();
        const sub = haystack.includes(ql);
        const sim = similarity(q, m.title);
        return { m, score: sub ? 1 + sim : sim };
      })
      .filter((x) => x.score >= 0.5)
      .sort((a, b) => b.score - a.score)
      .map((x) => x.m);
  }, [query, movies, categories]);

  // Detect duplicate / near-duplicate titles for the movie currently being edited.
  const similarMatches = useMemo(
    () => (draft.title.trim() ? findSimilar(draft.title, movies, { excludeId: draft.id, threshold: 0.7 }) : []),
    [draft.title, draft.id, movies]
  );

  // Catalog-wide duplicate clusters (titles that look alike across the library).
  const duplicateClusters = useMemo(() => {
    const seen = new Set<string>();
    const clusters: Movie[][] = [];
    for (const m of movies) {
      if (seen.has(m.id)) continue;
      const group = [m, ...findSimilar(m.title, movies, { excludeId: m.id, threshold: 0.85, limit: 20 }).map((s) => s.item)];
      if (group.length > 1) {
        group.forEach((g) => seen.add(g.id));
        clusters.push(group);
      }
    }
    return clusters;
  }, [movies]);

  const openNew = () => { setDraft(empty()); setOpen(true); };
  const openEdit = (m: Movie) => { setDraft({ ...m, ads: [...m.ads] }); setOpen(true); };

  const save = () => {
    if (!draft.title.trim()) { toast.error("Title is required"); return; }
    const list = getMovies();
    const slug = makeUniqueSlug(draft.slug?.trim() || draft.title, list, draft.id);
    if (draft.id) {
      const i = list.findIndex((m) => m.id === draft.id);
      if (i !== -1) list[i] = { ...draft, slug };
    } else {
      list.push({ ...draft, id: generateId(), slug, createdAt: new Date().toISOString() });
    }
    setMovies(list);
    refresh();
    setOpen(false);
    toast.success(draft.id ? "Movie updated" : "Movie created");
  };

  const remove = (id: string) => {
    if (!isAdmin) return toast.error("Only admins can delete movies");
    if (!confirm("Delete this movie?")) return;
    setMovies(getMovies().filter((m) => m.id !== id));
    refresh();
    toast.success("Movie deleted");
  };

  const aiAutofill = () => {
    if (!draft.title.trim()) return toast.error("Enter a title first");
    setAiLoading(true);
    setTimeout(() => {
      const samples = [
        `An epic tale of adventure and discovery, "${draft.title}" follows a protagonist who must navigate intrigue and danger to uncover the truth about their past.`,
        `In "${draft.title}", ordinary meets extraordinary as our hero discovers hidden powers and must rise to face an unprecedented threat.`,
        `"${draft.title}" is a masterful blend of drama and suspense, weaving together multiple storylines into a gripping narrative.`,
      ];
      setDraft((d) => ({ ...d, description: samples[Math.floor(Math.random() * samples.length)] }));
      setAiLoading(false);
      toast.success("Description generated");
    }, 1200);
  };

  const addAd = (type: AdType) => {
    setDraft((d) => ({
      ...d,
      ads: [...d.ads, { type, url: "", skipAfter: 5, ...(type === "midroll" ? { timestamp: 0 } : {}) }],
    }));
  };
  /**
   * Bulk-add ads from a list of files dropped onto the advertising zone.
   * Each file becomes its own ad row of the chosen type. Files are linked
   * locally (no upload) — the operator copies them into `public/media/`
   * (or their configured LAN base) and the player resolves them via
   * media-source.ts. Mid-roll ads get an auto-spaced default timestamp so
   * three drops produce a usable schedule without manual edits.
   */
  const addAdsFromFiles = (type: AdType, files: File[]) => {
    if (!files.length) return;
    const folderPart = `ads/${draft.slug || slugify(draft.title) || "untitled"}/${type}/`;
    const safe = (s: string) => s.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
    setDraft((d) => {
      const existingMid = d.ads.filter((a) => a.type === "midroll").length;
      const newAds: Ad[] = files.map((f, i) => {
        const ad: Ad = { type, url: `${folderPart}${safe(f.name)}`, skipAfter: 5 };
        if (type === "midroll") ad.timestamp = (existingMid + i + 1) * 600; // every 10 min
        return ad;
      });
      return { ...d, ads: [...d.ads, ...newAds] };
    });
    toast.success(
      `Linked ${files.length} ${type} ad${files.length === 1 ? "" : "s"}. Copy the files into public/media/${folderPart} so they can play.`,
      { duration: 7000 },
    );
  };
  const updateAd = (i: number, patch: Partial<Ad>) => {
    setDraft((d) => ({ ...d, ads: d.ads.map((a, idx) => (idx === i ? { ...a, ...patch } : a)) }));
  };
  const removeAd = (i: number) => setDraft((d) => ({ ...d, ads: d.ads.filter((_, idx) => idx !== i) }));

  return (
    <DashboardLayout>
      <header className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Movies</h1>
          <p className="text-muted-foreground mt-1">Manage your streaming catalog</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setImportOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-secondary hover:bg-secondary/70 font-medium flex items-center gap-2 transition-colors"
          >
            <Upload className="w-4 h-4" /> Bulk Import
          </button>
          <button
            onClick={openNew}
            className="px-5 py-2.5 rounded-xl gradient-brand text-primary-foreground font-semibold flex items-center gap-2 hover:shadow-glow hover:-translate-y-0.5 transition-all"
          >
            <Plus className="w-4 h-4" /> Add Movie
          </button>
        </div>
      </header>

      <div className="mb-6 flex flex-col gap-3">
        <div className="relative max-w-xl">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search movies by title, description, or category…"
            className={`${inputCls} pl-9 pr-9`}
            aria-label="Search movies"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        {query && (
          <p className="text-xs text-muted-foreground">
            {filteredMovies.length} of {movies.length} movies match "{query}"
          </p>
        )}
        {duplicateClusters.length > 0 && !query && (
          <div className="rounded-xl border border-warning/40 bg-warning/10 p-4">
            <div className="flex items-center gap-2 mb-2 text-warning font-semibold text-sm">
              <AlertTriangle className="w-4 h-4" />
              {duplicateClusters.length} possible duplicate {duplicateClusters.length === 1 ? "group" : "groups"} detected
            </div>
            <ul className="space-y-1.5 text-xs">
              {duplicateClusters.slice(0, 5).map((group, i) => (
                <li key={i} className="flex flex-wrap items-center gap-2">
                  <span className="text-muted-foreground">Similar:</span>
                  {group.map((g) => (
                    <button
                      key={g.id}
                      onClick={() => openEdit(g)}
                      className="px-2 py-0.5 rounded bg-background/60 hover:bg-background border border-border text-foreground"
                    >
                      {g.title}
                    </button>
                  ))}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {movies.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Film className="w-16 h-16 mx-auto mb-4 opacity-30" />
          <p>No movies yet. Click "Add Movie" to get started!</p>
        </div>
      ) : filteredMovies.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Search className="w-16 h-16 mx-auto mb-4 opacity-30" />
          <p>No movies match your search.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredMovies.map((m) => {
            const cat = categories.find((c) => c.id === m.categoryId);
            return (
              <article key={m.id} className="gradient-card border border-border rounded-2xl overflow-hidden hover:border-primary/50 hover:-translate-y-1 transition-all group">
                <div className="aspect-[2/3] bg-secondary overflow-hidden">
                  {m.poster ? (
                    <img src={m.poster} alt={m.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground"><Film className="w-12 h-12" /></div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-lg mb-2 truncate">{m.title}</h3>
                  <div className="flex gap-3 text-xs text-muted-foreground mb-3">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{m.duration || "?"} min</span>
                    <span className="flex items-center gap-1"><Tag className="w-3 h-3" />{cat?.name || "—"}</span>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-3 min-h-[2.5rem]">{m.description || "No description"}</p>
                  <div className="flex gap-2 mb-3 flex-wrap">
                    {!m.published && <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-warning/20 text-warning font-semibold">Draft</span>}
                    {m.published && <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-success/20 text-success font-semibold">Live</span>}
                    {m.ads.length > 0 && (
                      <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-primary/20 text-primary-glow font-semibold flex items-center gap-1">
                        <Megaphone className="w-3 h-3" /> {m.ads.length}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(m)} className="flex-1 py-2 rounded-lg bg-secondary hover:bg-secondary/70 text-sm font-medium flex items-center justify-center gap-1.5 transition-colors">
                      <Edit2 className="w-3.5 h-3.5" /> Edit
                    </button>
                    <button
                      onClick={() => setQrFor(m)}
                      title="QR code for public watch link"
                      className="px-3 py-2 rounded-lg bg-secondary hover:bg-secondary/70 transition-colors"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                    </button>
                    {isAdmin && (
                      <button onClick={() => remove(m.id)} className="px-3 py-2 rounded-lg bg-destructive/20 hover:bg-destructive text-destructive hover:text-destructive-foreground transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={draft.id ? "Edit Movie" : "Add Movie"}
        footer={
          <>
            <button onClick={() => setOpen(false)} className="px-5 py-2.5 rounded-xl bg-secondary hover:bg-secondary/70 font-medium transition-colors">Cancel</button>
            <button onClick={save} className="px-5 py-2.5 rounded-xl gradient-brand text-primary-foreground font-semibold hover:shadow-glow transition-all">Save Movie</button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setAiOpen(true)}
              className="text-xs px-3 py-1.5 rounded-lg gradient-brand text-primary-foreground font-medium flex items-center gap-1.5"
            >
              <Bot className="w-3.5 h-3.5" /> AI Assistant
            </button>
          </div>
          <Field label="Title">
            <input
              className={inputCls}
              value={draft.title}
              onChange={(e) => {
                const title = e.target.value;
                // Keep slug in sync with title until the user customizes it.
                const autoPrev = slugify(draft.title);
                const slug = !draft.slug || draft.slug === autoPrev ? slugify(title) : draft.slug;
                setDraft({ ...draft, title, slug });
              }}
            />
          </Field>

          {similarMatches.length > 0 && (
            <div className="rounded-xl border border-warning/40 bg-warning/10 p-3 text-xs space-y-2">
              <div className="flex items-center gap-2 text-warning font-semibold">
                <AlertTriangle className="w-4 h-4" />
                {similarMatches.some((s) => s.exact) ? "Duplicate title detected" : "Similar titles already exist"}
              </div>
              <ul className="space-y-1">
                {similarMatches.map(({ item, score, exact }) => (
                  <li key={item.id} className="flex items-center justify-between gap-2">
                    <span className="truncate">
                      <span className="text-foreground font-medium">{item.title}</span>
                      {item.year ? <span className="text-muted-foreground"> · {item.year}</span> : null}
                      <span className={`ml-2 px-1.5 py-0.5 rounded ${exact ? "bg-destructive/20 text-destructive" : "bg-secondary text-muted-foreground"}`}>
                        {exact ? "exact" : `${Math.round(score * 100)}%`}
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => openEdit(item)}
                      className="text-primary-glow hover:underline shrink-0"
                    >
                      Open
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <Field label="URL slug (used in /watch/:slug)">
            <input
              className={inputCls}
              placeholder="auto-generated-from-title"
              value={draft.slug}
              onChange={(e) => setDraft({ ...draft, slug: slugify(e.target.value) })}
            />
          </Field>

          <Field
            label="Description"
            action={
              <button
                onClick={aiAutofill}
                disabled={aiLoading}
                className="text-xs px-3 py-1.5 rounded-lg gradient-brand text-primary-foreground font-medium flex items-center gap-1.5 disabled:opacity-50"
              >
                {aiLoading ? <span className="w-3 h-3 border-2 border-primary-foreground/40 border-t-primary-foreground rounded-full animate-spin" /> : <Sparkles className="w-3 h-3" />}
                AI Autofill
              </button>
            }
          >
            <textarea rows={4} className={inputCls} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Category">
              <select className={inputCls} value={draft.categoryId} onChange={(e) => setDraft({ ...draft, categoryId: e.target.value })}>
                <option value="">Select category</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <Field label="Duration (minutes)">
              <input type="number" className={inputCls} value={draft.duration || ""} onChange={(e) => setDraft({ ...draft, duration: parseInt(e.target.value) || 0 })} />
            </Field>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Poster (drag & drop or upload)">
              <DropUpload
                bucket="posters"
                value={draft.poster}
                onChange={(url) => setDraft((d) => ({ ...d, poster: url }))}
                kind="image"
                aspect="poster"
                folder={draft.slug || slugify(draft.title)}
              />
            </Field>
            <Field label="Backdrop (drag & drop or upload)">
              <DropUpload
                bucket="backdrops"
                value={draft.backdrop}
                onChange={(url) => setDraft((d) => ({ ...d, backdrop: url }))}
                kind="image"
                aspect="wide"
                folder={draft.slug || slugify(draft.title)}
              />
            </Field>
          </div>
          <div className="rounded-xl border border-border bg-input/40 p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <HardDrive className="w-4 h-4 text-primary-glow" /> Local media source
            </div>
            <p className="text-xs text-muted-foreground -mt-1">
              Files dropped into <code className="px-1 rounded bg-secondary">public/media/</code> are served at <code className="px-1 rounded bg-secondary">/media/…</code>.
              Change the base below to point at a LAN server (e.g. <code className="px-1 rounded bg-secondary">http://192.168.1.10:8080/movies/</code>) or any mounted drive URL — every relative path is resolved against it.
            </p>
            <Field label="Local media base URL (this device)">
              <div className="flex gap-2">
                <input
                  className={inputCls}
                  placeholder={DEFAULT_MEDIA_BASE}
                  value={mediaBase}
                  onChange={(e) => commitMediaBase(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => commitMediaBase(DEFAULT_MEDIA_BASE)}
                  className="px-3 py-2 rounded-xl bg-secondary hover:bg-secondary/70 text-xs"
                  title="Reset to default /media/"
                >
                  Reset
                </button>
              </div>
            </Field>
            <Field label="Video source (filename, relative path, or full URL)">
              <div className="flex gap-2">
                <input
                  className={inputCls}
                  placeholder="oppenheimer.mp4   or   subdir/movie.mp4   or   https://…"
                  value={draft.video}
                  onChange={(e) => setDraft({ ...draft, video: e.target.value })}
                />
                <input
                  ref={videoFileRef}
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) setDraft((d) => ({ ...d, video: f.name }));
                    if (videoFileRef.current) videoFileRef.current.value = "";
                  }}
                />
                <button
                  type="button"
                  onClick={() => videoFileRef.current?.click()}
                  className="px-3 py-2 rounded-xl bg-secondary hover:bg-secondary/70 text-xs flex items-center gap-1.5 whitespace-nowrap"
                  title="Pick a local file to copy its filename into the field"
                >
                  <FolderOpen className="w-3.5 h-3.5" /> Browse
                </button>
              </div>
            </Field>
            <Field label="Drag & drop the video to link it locally (no upload)">
              <DropUpload
                bucket="videos"
                value={draft.video.startsWith("http") ? "" : draft.video}
                onChange={(v) => setDraft((d) => ({ ...d, video: v }))}
                kind="video"
                aspect="video"
                mode="local"
              />
              <p className="text-xs text-muted-foreground mt-2">
                Drag the movie file here — the CMS stores its filename and the player
                streams it from your configured local base
                (<code className="px-1 rounded bg-secondary">{mediaBase || DEFAULT_MEDIA_BASE}</code>).
                Copy the actual file into <code className="px-1 rounded bg-secondary">public/media/</code>
                or your LAN folder — no cloud upload, no size limits.
              </p>
            </Field>
            {draft.video && (
              <p className="text-xs text-muted-foreground break-all">
                <span className="text-foreground/70">Resolved URL:</span>{" "}
                <code className="px-1 rounded bg-secondary">{resolveMediaUrl(draft.video, mediaBase)}</code>
                {isLocalRelative(draft.video) && (
                  <span className="ml-2 inline-block px-1.5 py-0.5 rounded bg-primary/20 text-primary-glow text-[10px] uppercase tracking-wider font-semibold">
                    local
                  </span>
                )}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Year">
              <input type="number" className={inputCls} value={draft.year || ""} onChange={(e) => setDraft({ ...draft, year: parseInt(e.target.value) || 0 })} />
            </Field>
            <Field label="Rating (0-10)">
              <input type="number" step="0.1" min="0" max="10" className={inputCls} value={draft.rating ?? ""} onChange={(e) => setDraft({ ...draft, rating: parseFloat(e.target.value) || 0 })} />
            </Field>
          </div>

          <Field label="Hero Badge (shown when featured)">
            <input className={inputCls} placeholder="#1 SmileFlex Original" value={draft.badge || ""} onChange={(e) => setDraft({ ...draft, badge: e.target.value })} />
          </Field>

          <Field label="Weekly Trending Rank (1–10, optional — overrides play counts in Top 10 rows)">
            <input
              type="number"
              min="1"
              max="10"
              className={inputCls}
              placeholder="Leave empty to rank by play count"
              value={draft.weeklyTrendingRank ?? ""}
              onChange={(e) => {
                const v = e.target.value;
                setDraft({ ...draft, weeklyTrendingRank: v === "" ? undefined : Math.max(1, Math.min(10, parseInt(v) || 1)) });
              }}
            />
          </Field>

          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={draft.published} onChange={(e) => setDraft({ ...draft, published: e.target.checked })} className="w-4 h-4 accent-primary" />
              <span className="text-sm font-medium">Published</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={!!draft.featured} onChange={(e) => setDraft({ ...draft, featured: e.target.checked })} className="w-4 h-4 accent-primary" />
              <span className="text-sm font-medium">Featured (Hero Banner)</span>
            </label>
          </div>

          <div className="border-t border-border pt-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold flex items-center gap-2"><Megaphone className="w-4 h-4 text-primary-glow" /> Advertising</h3>
              <div className="flex gap-2">
                <button onClick={() => addAd("preroll")} className="text-xs px-3 py-1.5 rounded-lg bg-secondary hover:bg-secondary/70 transition-colors">+ Pre-roll</button>
                <button onClick={() => addAd("midroll")} className="text-xs px-3 py-1.5 rounded-lg bg-secondary hover:bg-secondary/70 transition-colors">+ Mid-roll</button>
                <button onClick={() => addAd("endroll")} className="text-xs px-3 py-1.5 rounded-lg bg-secondary hover:bg-secondary/70 transition-colors">+ End-roll</button>
              </div>
            </div>

            <BulkAdDropZone onFiles={addAdsFromFiles} />

            {draft.ads.length === 0 && <p className="text-xs text-muted-foreground">No ads configured</p>}

            <div className="space-y-3">
              {draft.ads.map((ad, i) => (
                <div key={i} className="bg-input border border-border rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-primary-glow">{ad.type} Ad</span>
                    <button onClick={() => removeAd(i)} className="text-destructive hover:text-destructive-foreground"><Trash2 className="w-4 h-4" /></button>
                  </div>
                  <DropUpload
                    bucket="videos"
                    value={ad.url}
                    onChange={(url) => updateAd(i, { url })}
                    kind="video"
                    aspect="video"
                    folder={`ads/${draft.slug || slugify(draft.title) || "untitled"}/${ad.type}`}
                    mode="local"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    {ad.type === "midroll" && (
                      <input type="number" className={inputCls} placeholder="Timestamp (s)" value={ad.timestamp ?? 0} onChange={(e) => updateAd(i, { timestamp: parseInt(e.target.value) || 0 })} />
                    )}
                    <input type="number" className={inputCls} placeholder="Skip after (s)" value={ad.skipAfter} onChange={(e) => updateAd(i, { skipAfter: parseInt(e.target.value) || 0 })} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Modal>

      <QrModal
        open={!!qrFor}
        onClose={() => setQrFor(null)}
        title={qrFor?.title || ""}
        url={qrFor ? watchUrl(qrFor) : ""}
      />

      <AIAssistantPanel
        open={aiOpen && open}
        onClose={() => setAiOpen(false)}
        draft={draft}
        categories={categories}
        onApply={(patch) => setDraft((d) => ({ ...d, ...patch }))}
      />

      <BulkImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        categories={categories}
        onImported={() => refresh()}
      />
    </DashboardLayout>
  );
}

/**
 * Multi-file drop zone for the Advertising section. Lets the editor drag
 * 3+ video files at once and pick which roll (pre / mid / end) they belong
 * to — each file becomes its own ad row. Click also opens a multi-select
 * file picker. Files are linked locally (no upload).
 */
function BulkAdDropZone({
  onFiles,
}: {
  onFiles: (type: AdType, files: File[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [type, setType] = useState<AdType>("preroll");

  const handleFiles = (list: FileList | null) => {
    if (!list) return;
    const files = Array.from(list).filter((f) => f.type.startsWith("video/"));
    if (!files.length) {
      toast.error("Please drop video files");
      return;
    }
    if (files.length < 3) {
      toast.message(`Tip: drop 3 or more videos at once to build a full ad break.`);
    }
    onFiles(type, files);
  };

  return (
    <div className="mb-4 rounded-xl border border-border bg-input/30 p-3 space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary-glow">
          <Layers className="w-3.5 h-3.5" /> Bulk drop ads (3+ at a time)
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground">Add as</span>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as AdType)}
            className="bg-secondary border border-border rounded-md px-2 py-1 text-xs"
          >
            <option value="preroll">Pre-roll</option>
            <option value="midroll">Mid-roll</option>
            <option value="endroll">End-roll</option>
          </select>
        </div>
      </div>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") { e.preventDefault(); inputRef.current?.click(); }
        }}
        className={`rounded-lg border-2 border-dashed px-4 py-6 text-center cursor-pointer transition-all ${
          dragOver ? "border-primary bg-primary/10" : "border-border hover:border-primary/60 hover:bg-input/60"
        }`}
      >
        <Upload className="w-6 h-6 mx-auto mb-1 text-muted-foreground" />
        <p className="text-sm font-medium">Drop multiple ad videos here</p>
        <p className="text-xs text-muted-foreground mt-1">
          Each file becomes its own <span className="text-foreground/80">{type}</span> ad. Mid-rolls are auto-spaced every 10 min.
        </p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="video/*"
        multiple
        className="hidden"
        onChange={(e) => {
          handleFiles(e.target.files);
          if (inputRef.current) inputRef.current.value = "";
        }}
      />
    </div>
  );
}
