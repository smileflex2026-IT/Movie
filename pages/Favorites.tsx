import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowUpDown, Clock, Heart, ListOrdered, Play, Trash2, X } from "lucide-react";
import { Movie, getMovies } from "@/lib/cms-storage";
import {
  clearFavorites,
  getFavorites,
  onFavoritesChange,
  removeFavorite,
} from "@/lib/favorites";
import { getFallbackArtForTitle } from "@/lib/movie-art";
import Logo from "@/components/Logo";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type SortMode = "newest" | "alpha" | "original";
const SORT_KEY = "smileflex_favorites_sort";

const isSortMode = (v: string | null): v is SortMode =>
  v === "newest" || v === "alpha" || v === "original";

const readSort = (): SortMode => {
  try {
    const v = localStorage.getItem(SORT_KEY);
    return isSortMode(v) ? v : "original";
  } catch {
    return "original";
  }
};

export default function Favorites() {
  const [favorites, setFavorites] = useState<string[]>(getFavorites);
  const [movies, setMovies] = useState<Movie[]>(() =>
    getMovies().filter((m) => m.published),
  );
  const [sort, setSort] = useState<SortMode>(readSort);

  // Persist sort choice across visits.
  useEffect(() => {
    try { localStorage.setItem(SORT_KEY, sort); } catch { /* ignore */ }
  }, [sort]);

  useEffect(() => {
    const refreshMovies = () =>
      setMovies(getMovies().filter((m) => m.published));
    refreshMovies();
    const off = onFavoritesChange(() => setFavorites(getFavorites()));
    window.addEventListener("focus", refreshMovies);
    return () => {
      off();
      window.removeEventListener("focus", refreshMovies);
    };
  }, []);

  // The favorites array is the user's original add-order. Index gives us a
  // cheap "newest first" signal (later index = added more recently). All
  // sorts work off this same baseline so behavior stays predictable.
  const items = useMemo(() => {
    const byId = new Map(movies.map((m) => [m.id, m]));
    const base = favorites
      .map((id, idx) => {
        const m = byId.get(id);
        return m ? { m, idx } : null;
      })
      .filter((x): x is { m: Movie; idx: number } => Boolean(x));

    if (sort === "alpha") {
      base.sort((a, b) => a.m.title.localeCompare(b.m.title, undefined, { sensitivity: "base" }));
    } else if (sort === "newest") {
      base.sort((a, b) => b.idx - a.idx);
    }
    // "original" keeps the favorites array order as-is.
    return base.map((x) => x.m);
  }, [favorites, movies, sort]);

  return (
    <div className="min-h-screen bg-[#141414] text-white font-sans">
      {/* Header */}
      <header className="px-[4%] py-4 flex items-center justify-between border-b border-white/10 sticky top-0 bg-[#141414]/95 backdrop-blur z-30">
        <div className="flex items-center gap-4">
          <Link
            to="/"
            aria-label="Back to home"
            className="inline-flex items-center gap-2 text-sm text-white/80 hover:text-[#FFD700] transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Home</span>
          </Link>
          <span className="hidden sm:block w-px h-6 bg-white/15" />
          <Link to="/" aria-label="SmileFlex home" className="hidden sm:flex">
            <Logo className="h-6 md:h-7 w-auto" />
          </Link>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-white/60">
            {items.length} {items.length === 1 ? "title" : "titles"}
          </span>
          {items.length > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button
                  className="inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded bg-white/10 hover:bg-[#E50914] hover:text-white transition"
                  aria-label="Clear all favorites"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Clear all</span>
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-[#1f1f1f] border-white/10 text-white">
                <AlertDialogHeader>
                  <AlertDialogTitle>Clear all favorites?</AlertDialogTitle>
                  <AlertDialogDescription className="text-white/70">
                    This will remove all {items.length}{" "}
                    {items.length === 1 ? "title" : "titles"} from your
                    favorites. You can always add them back later.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="bg-white/10 border-white/10 text-white hover:bg-white/20">
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => clearFavorites()}
                    className="bg-[#E50914] text-white hover:bg-[#E50914]/90"
                  >
                    Clear all
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </header>

      <main className="px-[4%] py-8">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <Heart className="w-7 h-7 fill-[#E50914] text-[#E50914]" />
            <h1 className="text-2xl md:text-3xl font-bold">My Favorites</h1>
          </div>
          {items.length > 1 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-white/60 hidden sm:inline">Sort by</span>
              <ToggleGroup
                type="single"
                value={sort}
                onValueChange={(v) => { if (isSortMode(v)) setSort(v); }}
                className="bg-white/5 rounded-lg p-1 gap-0"
                aria-label="Sort favorites"
              >
                <Tooltip>
                  <TooltipTrigger asChild>
                    <ToggleGroupItem
                      value="newest"
                      aria-label="Sort by newest added"
                      className="data-[state=on]:bg-[#FFD700] data-[state=on]:text-[#141414] text-white/70 hover:text-white hover:bg-white/10 rounded-md px-3 py-1.5 text-xs gap-1.5"
                    >
                      <Clock className="w-3.5 h-3.5" />
                      <span className="hidden md:inline">Newest</span>
                    </ToggleGroupItem>
                  </TooltipTrigger>
                  <TooltipContent>Newest added first</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <ToggleGroupItem
                      value="alpha"
                      aria-label="Sort alphabetically"
                      className="data-[state=on]:bg-[#FFD700] data-[state=on]:text-[#141414] text-white/70 hover:text-white hover:bg-white/10 rounded-md px-3 py-1.5 text-xs gap-1.5"
                    >
                      <ArrowUpDown className="w-3.5 h-3.5" />
                      <span className="hidden md:inline">A–Z</span>
                    </ToggleGroupItem>
                  </TooltipTrigger>
                  <TooltipContent>Alphabetical (A–Z)</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <ToggleGroupItem
                      value="original"
                      aria-label="Original order"
                      className="data-[state=on]:bg-[#FFD700] data-[state=on]:text-[#141414] text-white/70 hover:text-white hover:bg-white/10 rounded-md px-3 py-1.5 text-xs gap-1.5"
                    >
                      <ListOrdered className="w-3.5 h-3.5" />
                      <span className="hidden md:inline">Original</span>
                    </ToggleGroupItem>
                  </TooltipTrigger>
                  <TooltipContent>Order you added them</TooltipContent>
                </Tooltip>
              </ToggleGroup>
            </div>
          )}
        </div>

        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
              <Heart className="w-8 h-8 text-white/40" />
            </div>
            <h2 className="text-lg font-semibold mb-1">No favorites yet</h2>
            <p className="text-sm text-white/60 max-w-sm mb-6">
              Tap the heart on any movie to save it here for quick access.
            </p>
            <Link
              to="/"
              className="px-5 py-2.5 rounded bg-[#FFD700] text-[#141414] font-semibold text-sm hover:bg-[#FFD700]/90 transition"
            >
              Browse movies
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {items.map((m) => (
              <FavoriteCard key={m.id} movie={m} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function FavoriteCard({ movie }: { movie: Movie }) {
  const fallback = useMemo(
    () => getFallbackArtForTitle(movie.title).poster,
    [movie.title],
  );
  return (
    <div className="group relative rounded-lg overflow-hidden bg-[#1f1f1f] transition-transform duration-200 hover:scale-[1.03] hover:shadow-[0_10px_30px_rgba(0,0,0,0.6)]">
      <Link
        to={`/watch/${movie.slug}`}
        aria-label={`Play ${movie.title}`}
        className="block"
      >
        <div className="relative aspect-[2/3] bg-[#2a2a2a]">
          <img
            src={movie.poster || fallback}
            alt={movie.title}
            loading="lazy"
            onError={(e) => {
              const img = e.currentTarget;
              if (img.src !== fallback) img.src = fallback;
            }}
            className="w-full h-full object-cover"
          />
          <span className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-[#FFD700] text-[#141414] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
            <Play className="w-5 h-5 fill-[#141414]" />
          </span>
        </div>
        <div className="p-2.5 flex items-center justify-between gap-2">
          <span className="text-sm text-white truncate">{movie.title}</span>
          {movie.year ? (
            <span className="text-xs text-white/60 shrink-0">{movie.year}</span>
          ) : null}
        </div>
      </Link>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          removeFavorite(movie.id);
        }}
        aria-label={`Remove ${movie.title} from favorites`}
        className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/70 text-white hover:bg-[#E50914] flex items-center justify-center backdrop-blur-sm transition-colors z-10 opacity-90"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
