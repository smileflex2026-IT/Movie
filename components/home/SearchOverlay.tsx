import { useEffect, useMemo, useRef, useState } from "react";
import { Search, X, Play, Star, ArrowUpDown } from "lucide-react";
import { Movie, getMovies, getCategories } from "@/lib/cms-storage";
import { getFallbackArtForTitle } from "@/lib/movie-art";
import { similarity } from "@/lib/similarity";

interface SearchOverlayProps {
  open: boolean;
  onClose: () => void;
  onPlay: (m: Movie) => void;
}

type SortMode = "relevance" | "newest" | "rating";

const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: "relevance", label: "Relevance" },
  { value: "newest", label: "Newest" },
  { value: "rating", label: "Rating" },
];

/**
 * Production-ready search overlay for the top navbar. Searches every
 * published movie in the CMS (title, description, year, category) with
 * fuzzy matching so light typos still surface results. Selecting a result
 * plays the movie immediately via the existing player.
 */
export default function SearchOverlay({ open, onClose, onPlay }: SearchOverlayProps) {
  const [q, setQ] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const [sort, setSort] = useState<SortMode>("relevance");
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Pull fresh CMS data each time the overlay opens so newly-added movies
  // appear without needing a page reload.
  const { movies, categoryName } = useMemo(() => {
    if (!open) return { movies: [] as Movie[], categoryName: new Map<string, string>() };
    const all = getMovies().filter((m) => m.published);
    const cats = getCategories();
    const map = new Map(cats.map((c) => [c.id, c.name]));
    return { movies: all, categoryName: map };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setQ("");
    setActiveIdx(0);
    // Defer focus until the input is mounted & the open transition runs.
    const t = setTimeout(() => inputRef.current?.focus(), 30);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      clearTimeout(t);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  const results = useMemo(() => {
    const query = q.trim().toLowerCase();
    const applySort = (arr: { m: Movie; score: number }[]) => {
      if (sort === "newest") {
        return arr
          .slice()
          .sort((a, b) => (b.m.createdAt || "").localeCompare(a.m.createdAt || ""));
      }
      if (sort === "rating") {
        return arr
          .slice()
          .sort((a, b) => (b.m.rating || 0) - (a.m.rating || 0) || a.m.title.localeCompare(b.m.title));
      }
      // Relevance — keep score order; ties broken by title.
      return arr
        .slice()
        .sort((a, b) => b.score - a.score || a.m.title.localeCompare(b.m.title));
    };
    if (!query) {
      // No query → browse list. Default ordering is "newest" since
      // relevance has no meaning without a query; otherwise honour the
      // viewer's chosen sort.
      const all = movies.map((m) => ({ m, score: 0 }));
      const sorted =
        sort === "rating"
          ? applySort(all)
          : all.slice().sort((a, b) => (b.m.createdAt || "").localeCompare(a.m.createdAt || ""));
      return sorted.slice(0, 24);
    }
    const scored: { m: Movie; score: number }[] = [];
    for (const m of movies) {
      const title = m.title.toLowerCase();
      const desc = (m.description || "").toLowerCase();
      const cat = (categoryName.get(m.categoryId) || "").toLowerCase();
      const yearStr = m.year ? String(m.year) : "";
      let score = 0;
      if (title === query) score = 1;
      else if (title.startsWith(query)) score = 0.95;
      else if (title.includes(query)) score = 0.85;
      else if (cat.includes(query)) score = 0.7;
      else if (yearStr === query) score = 0.7;
      else if (desc.includes(query)) score = 0.6;
      else {
        // Fuzzy fallback for typos.
        const sim = similarity(query, title);
        if (sim >= 0.5) score = sim * 0.55;
      }
      if (score > 0) scored.push({ m, score });
    }
    return applySort(scored).slice(0, 50);
  }, [q, movies, categoryName, sort]);

  useEffect(() => {
    setActiveIdx(0);
  }, [q]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(results.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const pick = results[activeIdx];
      if (pick) {
        onPlay(pick.m);
        onClose();
      }
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[1500] bg-black/85 backdrop-blur-sm flex items-start justify-center pt-20 px-4 animate-in fade-in duration-150"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Search movies"
    >
      <div
        className="w-full max-w-3xl bg-[#141414] border border-white/10 rounded-xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
          <Search className="w-5 h-5 text-white/60 shrink-0" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search movies, genres, years…"
            className="flex-1 bg-transparent text-white placeholder:text-white/40 text-base outline-none"
            aria-label="Search movies"
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close search"
            className="w-8 h-8 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/15 text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div ref={listRef} className="max-h-[60vh] overflow-y-auto">
          <div className="flex items-center justify-between gap-3 px-4 py-2 border-b border-white/10 bg-white/[0.02] sticky top-0 z-10">
            <span className="text-[11px] uppercase tracking-wider text-white/40 flex items-center gap-1.5">
              <ArrowUpDown className="w-3 h-3" /> Sort by
            </span>
            <div role="radiogroup" aria-label="Sort search results" className="flex items-center gap-1">
              {SORT_OPTIONS.map((opt) => {
                const active = sort === opt.value;
                const disabled = opt.value === "relevance" && !q.trim();
                return (
                  <button
                    key={opt.value}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    disabled={disabled}
                    title={disabled ? "Type a query to sort by relevance" : `Sort by ${opt.label.toLowerCase()}`}
                    onClick={() => setSort(opt.value)}
                    className={`text-xs px-2.5 py-1 rounded-full transition-colors ${
                      active
                        ? "bg-[#FFD700] text-[#141414] font-semibold"
                        : "bg-white/5 text-white/70 hover:bg-white/10"
                    } disabled:opacity-40 disabled:cursor-not-allowed`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
          {results.length === 0 ? (
            <div className="px-6 py-10 text-center text-white/60 text-sm">
              {q.trim() ? (
                <>No results for &ldquo;{q}&rdquo;. Try another title or genre.</>
              ) : (
                <>No movies available yet.</>
              )}
            </div>
          ) : (
            <ul role="listbox">
              {!q.trim() && (
                <li className="px-4 pt-3 pb-1 text-[11px] uppercase tracking-wider text-white/40">
                  Recently added
                </li>
              )}
              {results.map(({ m }, idx) => {
                const isActive = idx === activeIdx;
                const fallback = getFallbackArtForTitle(m.title).poster;
                const cat = categoryName.get(m.categoryId);
                return (
                  <li key={m.id} role="option" aria-selected={isActive}>
                    <button
                      type="button"
                      onMouseEnter={() => setActiveIdx(idx)}
                      onClick={() => {
                        onPlay(m);
                        onClose();
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                        isActive ? "bg-white/10" : "hover:bg-white/5"
                      }`}
                    >
                      <div className="w-10 h-14 shrink-0 rounded overflow-hidden bg-[#2a2a2a]">
                        <img
                          src={m.poster || fallback}
                          alt=""
                          loading="lazy"
                          onError={(e) => {
                            const img = e.currentTarget;
                            if (img.src !== fallback) img.src = fallback;
                          }}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-white truncate">{m.title}</div>
                        <div className="text-xs text-white/50 flex items-center gap-2 mt-0.5">
                          {m.year && <span>{m.year}</span>}
                          {m.duration ? <span>{m.duration} min</span> : null}
                          {m.rating ? (
                            <span className="flex items-center gap-1 text-[#FFD700]">
                              <Star className="w-3 h-3 fill-[#FFD700]" />
                              {m.rating.toFixed(1)}
                            </span>
                          ) : null}
                          {cat && <span className="truncate">· {cat}</span>}
                        </div>
                      </div>
                      <span
                        className={`shrink-0 inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full transition ${
                          isActive
                            ? "bg-[#FFD700] text-[#141414]"
                            : "bg-white/10 text-white"
                        }`}
                        aria-hidden
                      >
                        <Play className={`w-3 h-3 ${isActive ? "fill-[#141414]" : "fill-white"}`} />
                        Play
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="flex items-center justify-between px-4 py-2 border-t border-white/10 text-[11px] text-white/40">
          <span>
            {results.length} {results.length === 1 ? "result" : "results"}
          </span>
          <span className="hidden sm:inline">↑ ↓ navigate · ⏎ play · esc close</span>
        </div>
      </div>
    </div>
  );
}