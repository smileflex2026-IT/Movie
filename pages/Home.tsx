import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Play, Info, Search, Bell, X, Star, Settings, Heart, GripVertical, ChevronLeft, ChevronRight } from "lucide-react";
import {
  Movie,
  Category,
  getMovies,
  getCategories,
  getPlayCounts,
  getLastPlayed,
  incrementPlayCount,
  rankTopTen,
} from "@/lib/cms-storage";
import {
  RailSettings,
  getCachedRailSettings,
  fetchRailSettings,
} from "@/lib/rail-settings";
import {
  getFavorites,
  isFavorite,
  toggleFavorite,
  reorderFavorites,
  onFavoritesChange,
} from "@/lib/favorites";
import { getFallbackArtForTitle } from "@/lib/movie-art";
import { resolveMediaUrl } from "@/lib/media-source";
import {
  applyRailOrder,
  getRailOrder,
  onRailOrderChange,
  setRailOrder,
} from "@/lib/rail-order";
import { SortableRail, DragHandleProps } from "@/components/home/SortableRail";
import introVideo from "@/assets/intro.mp4";
import Logo from "@/components/Logo";
import SearchOverlay from "@/components/home/SearchOverlay";
import PlayerModal from "@/components/PlayerModal";

function IntroOverlay({ onDone }: { onDone: () => void }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [skippable, setSkippable] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setSkippable(true), 1500);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="fixed inset-0 z-[2000] bg-black flex items-center justify-center">
      {/* Mobile: 9:16 portrait, contained. Desktop: 16:9 cropped via object-cover */}
      <video
        ref={ref}
        src={introVideo}
        autoPlay
        muted
        playsInline
        onEnded={onDone}
        className="md:hidden w-full h-full object-contain"
      />
      <video
        src={introVideo}
        autoPlay
        muted
        playsInline
        onEnded={onDone}
        className="hidden md:block w-full h-full object-cover [object-position:center_15%] lg:[object-position:center_25%] xl:[object-position:center_35%] 2xl:[object-position:center_50%] [@media(min-aspect-ratio:21/9)]:[object-position:center_60%]"
        style={{ aspectRatio: "16 / 9" }}
      />
      {skippable && (
        <button
          onClick={onDone}
          className="absolute bottom-6 right-6 bg-white/10 hover:bg-white/20 text-white text-sm px-4 py-2 rounded backdrop-blur"
        >
          Skip Intro ▶
        </button>
      )}
    </div>
  );
}

function useCmsData() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [playCounts, setPlayCounts] = useState<Record<string, number>>({});
  const [lastPlayed, setLastPlayed] = useState<Record<string, number>>({});
  const [railSettings, setRailSettings] = useState<RailSettings>(getCachedRailSettings);
  const [favorites, setFavorites] = useState<string[]>(getFavorites);
  // Bumps when ANY rail's saved order changes so memos relying on
  // getRailOrder() re-evaluate without us tracking each rail individually.
  const [orderTick, setOrderTick] = useState(0);
  useEffect(() => {
    const load = () => {
      setMovies(getMovies().filter((m) => m.published));
      setCategories([...getCategories()].sort((a, b) => a.order - b.order));
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
    const offOrder = onRailOrderChange(() => setOrderTick((t) => t + 1));
    // Pull latest server-side rail settings (cache covers initial render).
    fetchRailSettings().then(setRailSettings).catch(() => {/* ignore */});
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", load);
      offFav();
      offOrder();
    };
  }, []);
  return { movies, categories, playCounts, lastPlayed, railSettings, favorites, orderTick };
}


function Card({
  movie,
  onPlay,
  isFav,
  onToggleFav,
  dragHandle,
  style,
}: {
  movie: Movie;
  onPlay: () => void;
  isFav: boolean;
  onToggleFav: () => void;
  dragHandle?: DragHandleProps;
  style?: React.CSSProperties;
}) {
  const fallback = useMemo(() => getFallbackArtForTitle(movie.title).poster, [movie.title]);
  const posterSrc = useMemo(() => (movie.poster ? resolveMediaUrl(movie.poster) : ""), [movie.poster]);
  const insertionSide = dragHandle?.insertionSide ?? null;
  return (
    <div
      ref={dragHandle?.ref}
      style={style}
      className={`group flex-none w-[160px] sm:w-[200px] md:w-[220px] rounded-lg bg-[#1f1f1f] text-left transition-transform duration-200 hover:scale-[1.06] hover:z-10 hover:shadow-[0_10px_30px_rgba(0,0,0,0.6)] relative ${
        dragHandle?.isOver ? "ring-2 ring-[#FFD700]" : ""
      }`}
      {...(dragHandle?.attributes ?? {})}
    >
      {insertionSide && (
        <span
          aria-hidden
          className={`pointer-events-none absolute top-0 bottom-0 w-1 rounded-full bg-[#FFD700] shadow-[0_0_12px_rgba(255,215,0,0.95)] animate-pulse z-30 ${
            insertionSide === "left" ? "-left-2" : "-right-2"
          }`}
        />
      )}
      <button
        type="button"
        onClick={onPlay}
        className="block w-full text-left"
        aria-label={`Play ${movie.title}`}
      >
      <div className="relative aspect-[2/3] bg-[#2a2a2a]">
        {posterSrc ? (
          <img
            src={posterSrc}
            alt={movie.title}
            loading="lazy"
            onError={(e) => {
              const img = e.currentTarget;
              if (img.src !== fallback) img.src = fallback;
            }}
            className="w-full h-full object-cover"
          />
        ) : (
          <img
            src={fallback}
            alt={movie.title}
            loading="lazy"
            className="w-full h-full object-cover"
          />
        )}
        {movie.rating ? (
          <span className="absolute top-2 left-2 bg-black/70 text-[#FFD700] text-xs px-2 py-1 rounded flex items-center gap-1">
            <Star className="w-3 h-3 fill-[#FFD700]" />
            {movie.rating.toFixed(1)}
          </span>
        ) : null}
        <span className="absolute left-1/2 -translate-x-1/2 bottom-16 w-10 h-10 rounded-full bg-[#FFD700] text-[#141414] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
          <Play className="w-5 h-5 fill-[#141414]" />
        </span>
      </div>
      <div className="p-3 flex items-center justify-between">
        <span className="text-sm text-white truncate max-w-[140px]">{movie.title}</span>
        {movie.year ? <span className="text-xs text-white/60">{movie.year}</span> : null}
      </div>
      </button>
      {dragHandle && (
        <button
          type="button"
          {...(dragHandle.listeners ?? {})}
          aria-label={`Drag ${movie.title} to reorder`}
          title="Drag to reorder"
          className="absolute bottom-14 left-2 w-9 h-9 rounded-full flex items-center justify-center bg-black/70 hover:bg-black/90 text-white backdrop-blur-sm cursor-grab active:cursor-grabbing touch-none z-10 opacity-100 md:opacity-0 md:group-hover:opacity-100 focus-visible:opacity-100 transition-opacity shadow-md ring-1 ring-white/10"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="w-4 h-4" />
        </button>
      )}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggleFav();
        }}
        aria-label={isFav ? `Remove ${movie.title} from favorites` : `Add ${movie.title} to favorites`}
        aria-pressed={isFav}
        className={`absolute top-2 right-2 w-9 h-9 rounded-full flex items-center justify-center backdrop-blur-sm transition-colors z-10 ${
          isFav
            ? "bg-[#E50914] text-white hover:bg-[#E50914]/90"
            : "bg-black/60 text-white hover:bg-black/80"
        }`}
      >
        <Heart className={`w-4 h-4 ${isFav ? "fill-white" : ""}`} />
      </button>
    </div>
  );
}

export default function Home() {
  const { movies, categories, playCounts, lastPlayed, railSettings, favorites, orderTick } = useCmsData();
  const [playing, setPlaying] = useState<Movie | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const favSet = useMemo(() => new Set(favorites), [favorites]);
  // Hero carousel state — current slide + per-slide video readiness so each
  // poster smoothly cross-fades into its looping preview without stalling
  // the carousel rotation.
  const [heroIndex, setHeroIndex] = useState(0);
  const [heroVideoReady, setHeroVideoReady] = useState(false);
  const [heroVideoFailed, setHeroVideoFailed] = useState(false);
  const [heroPaused, setHeroPaused] = useState(false);
  const [showIntro, setShowIntro] = useState(() => {
    if (typeof window === "undefined") return false;
    return !sessionStorage.getItem("smileflex_intro_played");
  });

  const dismissIntro = () => {
    sessionStorage.setItem("smileflex_intro_played", "1");
    setShowIntro(false);
  };

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Featured carousel — the 11 titles requested by the product team. Each
  // pairs a TMDB poster/backdrop with a royalty-free Google sample MP4 so
  // the hero loops a real video preview without licensing concerns. The
  // displayed order is reshuffled on every full page load so repeat
  // visitors don't see the same opening slide every time.
  const heroPool = useMemo<Movie[]>(() => {
    const G = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample";
    const TMDB = "https://image.tmdb.org/t/p";
    const now = new Date().toISOString();
    const pool: Movie[] = [
      {
        id: "hero-oppenheimer", title: "Oppenheimer", slug: "oppenheimer",
        description: "The story of J. Robert Oppenheimer and his role in the development of the atomic bomb — a haunting portrait of genius, ambition, and the moral weight of unleashing a new era.",
        poster: `${TMDB}/w500/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg`,
        backdrop: `${TMDB}/original/fm6KqXpk3M2HVveHwCrBSSBaO0V.jpg`,
        video: `${G}/ForBiggerBlazes.mp4`,
        duration: 180, categoryId: "", published: true, ads: [], createdAt: now,
        year: 2023, rating: 8.4, featured: true, badge: "Award-Winning Preview",
      },
      {
        id: "hero-red-notice", title: "Red Notice", slug: "red-notice",
        description: "An Interpol agent tracks the world's most wanted art thief — a globe-trotting heist caper packed with double-crosses, charm, and high-octane chases.",
        poster: `${TMDB}/w500/lAXONuqg41NwUMuzMiFvicDET9Y.jpg`,
        backdrop: `${TMDB}/original/4Y1WNkd88JXmGfhtWR7dmDAo1T2.jpg`,
        video: `${G}/ForBiggerJoyrides.mp4`,
        duration: 118, categoryId: "", published: true, ads: [], createdAt: now,
        year: 2021, rating: 6.3, featured: true, badge: "Heist Spotlight",
      },
      {
        id: "hero-joker", title: "Joker", slug: "joker",
        description: "A failed comedian descends into madness and becomes a violent revolutionary in a city that has forgotten him — a haunting origin story for the clown prince of crime.",
        poster: `${TMDB}/w500/udDclJoHjfjb8Ekgsd4FDteOkCU.jpg`,
        backdrop: `${TMDB}/original/n6bUvigpRFqSwmPp1m2YADdbRBc.jpg`,
        video: `${G}/ForBiggerMeltdowns.mp4`,
        duration: 122, categoryId: "", published: true, ads: [], createdAt: now,
        year: 2019, rating: 8.2, featured: true, badge: "Cinematic Preview",
      },
      {
        id: "hero-wednesday", title: "Wednesday", slug: "wednesday",
        description: "Wednesday Addams investigates a monstrous mystery at Nevermore Academy while mastering her psychic powers and uncovering a 25-year-old murder spree.",
        poster: `${TMDB}/w500/9PFonBhy4cQy7Jz20NpMygczOkv.jpg`,
        backdrop: `${TMDB}/original/iHSwvRVsRyxpX7FE7GbviaDvgGZ.jpg`,
        video: `${G}/Sintel.mp4`,
        duration: 50, categoryId: "", published: true, ads: [], createdAt: now,
        year: 2022, rating: 8.5, featured: true, badge: "Series Spotlight",
      },
      {
        id: "hero-the-crown", title: "The Crown", slug: "the-crown",
        description: "The political rivalries and personal drama of Queen Elizabeth II's reign — a sweeping account of the monarchy that shaped the second half of the twentieth century.",
        poster: `${TMDB}/w500/1M876KPjulVwppEpldhdc8V4o68.jpg`,
        backdrop: `${TMDB}/original/8riWcADI1ekEiBguVB9vkilhiQm.jpg`,
        video: `${G}/ElephantsDream.mp4`,
        duration: 58, categoryId: "", published: true, ads: [], createdAt: now,
        year: 2016, rating: 8.6, featured: true, badge: "Prestige Drama",
      },
      {
        id: "hero-squid-game", title: "Squid Game", slug: "squid-game",
        description: "Hundreds of cash-strapped contestants accept an invitation to compete in children's games for a tempting prize — but the stakes are deadly.",
        poster: `${TMDB}/w500/dDlEmu3EZ0Pgg93K2SVNLCjCSvE.jpg`,
        backdrop: `${TMDB}/original/qw3J9cNeLioOLoR68WX7z79aCdK.jpg`,
        video: `${G}/SubaruOutbackOnStreetAndDirt.mp4`,
        duration: 55, categoryId: "", published: true, ads: [], createdAt: now,
        year: 2021, rating: 7.8, featured: true, badge: "Global Phenomenon",
      },
      {
        id: "hero-dark", title: "Dark", slug: "dark",
        description: "A missing child sets four families on a frantic hunt for answers as they unearth a mind-bending mystery that spans three generations and shatters time itself.",
        poster: `${TMDB}/w500/apbrbWs8M9lyOpJYU5WXrpFbk1Z.jpg`,
        backdrop: `${TMDB}/original/rrwt0u1rW685u9bJ9ougg5HJEHC.jpg`,
        video: `${G}/TearsOfSteel.mp4`,
        duration: 60, categoryId: "", published: true, ads: [], createdAt: now,
        year: 2017, rating: 8.7, featured: true, badge: "Sci-Fi Mystery",
      },
      {
        id: "hero-friends", title: "Friends", slug: "friends",
        description: "Six twentysomethings navigate love, careers, and life in 1990s Manhattan — the iconic comedy that defined a generation of best-friend sitcoms.",
        poster: `${TMDB}/w500/2koX1xLkpTQM4IZebYvKysFW1Nh.jpg`,
        backdrop: `${TMDB}/original/l0qVZIpXtIo7km9u5Yqh0nKPOr5.jpg`,
        video: `${G}/ForBiggerFun.mp4`,
        duration: 22, categoryId: "", published: true, ads: [], createdAt: now,
        year: 1994, rating: 8.5, featured: true, badge: "Classic Comedy",
      },
      {
        id: "hero-the-office", title: "The Office", slug: "the-office",
        description: "A motley crew of office workers grind through the absurd reality of corporate life at Dunder Mifflin — a mockumentary that turned awkward into iconic.",
        poster: `${TMDB}/w500/qWnJzyZhyy74gjpSjIXWmuk0ifX.jpg`,
        backdrop: `${TMDB}/original/7Lg2rGHJ7QYfdfg7pXQuxYbY6cv.jpg`,
        video: `${G}/ForBiggerEscapes.mp4`,
        duration: 22, categoryId: "", published: true, ads: [], createdAt: now,
        year: 2005, rating: 8.6, featured: true, badge: "Mockumentary Pick",
      },
      {
        id: "hero-mad-max-fury", title: "Mad Max: Fury Road", slug: "mad-max-fury-road",
        description: "In a post-apocalyptic wasteland, Max teams up with a mysterious woman to flee a tyrannical warlord across the desert in a relentless, fire-and-fury chase.",
        poster: `${TMDB}/w500/8tZYtuWezp8JbcsvHYO0O46tFbo.jpg`,
        backdrop: `${TMDB}/original/gqrnQA6Xppdl8vIb2eJc58VC1tW.jpg`,
        video: `${G}/WeAreGoingOnBullrun.mp4`,
        duration: 120, categoryId: "", published: true, ads: [], createdAt: now,
        year: 2015, rating: 8.1, featured: true, badge: "Action Spotlight",
      },
      {
        id: "hero-john-wick-4", title: "John Wick: Chapter 4", slug: "john-wick-chapter-4",
        description: "John Wick uncovers a path to defeating the High Table — but before he can earn his freedom, he must face off against a new enemy with powerful alliances across the globe.",
        poster: `${TMDB}/w500/vZloFAK7NmvMGKE7VkF5UHaz0I.jpg`,
        backdrop: `${TMDB}/original/h8gHn0OzBoaefsYseUByqsmEDMY.jpg`,
        video: `${G}/BigBuckBunny.mp4`,
        duration: 169, categoryId: "", published: true, ads: [], createdAt: now,
        year: 2023, rating: 7.7, featured: true, badge: "Action Spotlight",
      },
    ];
    // Overlay CMS-edited values so any poster/backdrop/video/description
    // updated by the editor in /cms/movies takes precedence over the
    // hardcoded TMDB defaults. Match by slug first, then by title.
    const bySlug = new Map(movies.map((m) => [m.slug, m]));
    const byTitle = new Map(movies.map((m) => [m.title.toLowerCase(), m]));
    for (let i = 0; i < pool.length; i++) {
      const h = pool[i];
      const cms = bySlug.get(h.slug) ?? byTitle.get(h.title.toLowerCase());
      if (!cms) continue;
      pool[i] = {
        ...h,
        // Prefer the CMS asset (resolved through the media base so bare
        // filenames stored by local-mode uploads render correctly).
        poster: cms.poster ? resolveMediaUrl(cms.poster) : h.poster,
        backdrop: cms.backdrop ? resolveMediaUrl(cms.backdrop) : h.backdrop,
        video: cms.video ? resolveMediaUrl(cms.video) : h.video,
        description: cms.description || h.description,
        year: cms.year ?? h.year,
        rating: cms.rating ?? h.rating,
        ads: cms.ads?.length ? cms.ads : h.ads,
      };
    }
    // Fisher–Yates shuffle so the opening slide rotates per session.
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool;
  }, [movies]);

  const hero = heroPool[heroIndex];

  // Reset video state whenever the active hero changes so the new clip gets
  // a fair chance to load before falling back to its still backdrop.
  useEffect(() => {
    setHeroVideoReady(false);
    setHeroVideoFailed(false);
  }, [heroIndex]);

  // Auto-advance every 8 seconds. Pauses on hover/focus and when the tab is
  // hidden so we don't spin through slides while the user can't see them.
  useEffect(() => {
    if (heroPaused || heroPool.length <= 1) return;
    const t = setInterval(() => {
      setHeroIndex((i) => (i + 1) % heroPool.length);
    }, 8000);
    return () => clearInterval(t);
  }, [heroPaused, heroPool.length]);

  const goHeroPrev = () =>
    setHeroIndex((i) => (i - 1 + heroPool.length) % heroPool.length);
  const goHeroNext = () =>
    setHeroIndex((i) => (i + 1) % heroPool.length);

  const moviesByCategory = useMemo(() => {
    const map = new Map<string, Movie[]>();
    for (const c of categories) map.set(c.id, []);
    for (const m of movies) {
      const arr = map.get(m.categoryId);
      if (arr) arr.push(m);
    }
    return map;
  }, [movies, categories]);

  const playMovie = (m: Movie) => {
    incrementPlayCount(m.id);
    setPlaying(m);
  };

  return (
    <div className="min-h-screen bg-[#141414] text-white font-sans">
      {/* Navbar */}
      <header
        className={`fixed top-0 left-0 right-0 z-40 px-[4%] py-4 flex items-center justify-between transition-colors ${
          scrolled ? "bg-[#141414]" : "bg-gradient-to-b from-black/80 to-transparent"
        }`}
      >
        <div className="flex items-center gap-8">
          <a href="/" className="flex items-center" aria-label="SmileFlex home">
            <Logo className="h-7 md:h-8 w-auto select-none" />
          </a>
          <nav className="hidden md:flex gap-6 text-sm text-[#e5e5e5]">
            <a href="#" className="hover:text-[#FFD700] text-[#FFD700]">Home</a>
            <a href="#" className="hover:text-[#FFD700]">TV Shows</a>
            <a href="#" className="hover:text-[#FFD700]">Movies</a>
            <a href="#" className="hover:text-[#FFD700]">New & Popular</a>
            <a href="#" className="hover:text-[#FFD700]">My List</a>
          </nav>
        </div>
        <div className="flex items-center gap-5 text-white">
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            aria-label="Search movies"
            className="hover:text-[#FFD700] transition-colors"
          >
            <Search className="w-5 h-5" />
          </button>
          <Bell className="w-5 h-5 cursor-pointer hover:text-[#FFD700]" />
          <Link
            to="/favorites"
            aria-label="My Favorites"
            className="inline-flex items-center gap-2 text-xs px-2 sm:px-3 py-1.5 rounded bg-white/10 hover:bg-[#E50914] hover:text-white transition"
          >
            <Heart className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
            <span className="hidden sm:inline">Favorites</span>
          </Link>
          {/* CMS access — icon-only on mobile, labeled on tablet+ */}
          <Link
            to="/cms/movies"
            aria-label="Open CMS"
            className="inline-flex items-center gap-2 text-xs px-2 sm:px-3 py-1.5 rounded bg-white/10 hover:bg-[#FFD700] hover:text-[#141414] transition"
          >
            <Settings className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
            <span className="hidden sm:inline">CMS</span>
          </Link>
        </div>
      </header>

      {/* Hero */}
      {hero && (
        <section
          className="relative h-[85vh] min-h-[500px] flex items-center px-[4%] overflow-hidden group/hero"
          onMouseEnter={() => setHeroPaused(true)}
          onMouseLeave={() => setHeroPaused(false)}
          onFocusCapture={() => setHeroPaused(true)}
          onBlurCapture={() => setHeroPaused(false)}
          aria-roledescription="carousel"
          aria-label="Featured movie previews"
        >
          {/* Always-rendered backdrop fallback. Stays visible until the video
              successfully starts playing; reappears if the video errors. */}
          {(hero.backdrop || hero.poster) && (
            <img
              src={hero.backdrop || hero.poster}
              alt=""
              aria-hidden
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
                heroVideoReady && !heroVideoFailed ? "opacity-0" : "opacity-100"
              }`}
            />
          )}

          {/* Looping muted background preview — multiple sources so at least one loads. */}
          {!heroVideoFailed && (
            <video
              key={hero.video}
              poster={hero.backdrop || hero.poster}
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
              aria-hidden
              onPlaying={() => setHeroVideoReady(true)}
              onError={() => setHeroVideoFailed(true)}
              ref={(el) => {
                if (el) {
                  el.muted = true;
                  const tryPlay = () =>
                    el.play().then(() => setHeroVideoReady(true)).catch(() => {
                      // Autoplay blocked — fall back to the poster image.
                      setHeroVideoFailed(true);
                    });
                  tryPlay();
                  el.addEventListener("canplay", tryPlay, { once: true });
                }
              }}
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
                heroVideoReady ? "opacity-100" : "opacity-0"
              }`}
            >
              <source src={hero.video} type="video/mp4" />
              <source
                src="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4"
                type="video/mp4"
              />
              <source
                src="https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/720/Big_Buck_Bunny_720_10s_1MB.mp4"
                type="video/mp4"
              />
            </video>
          )}
          {/* Overlays for legibility — left-weighted so the video stays visible on the right. */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#141414] via-[#141414]/60 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#141414] to-transparent" />

          <div className="relative max-w-xl mt-16">
            {hero.badge && (
              <span className="inline-block bg-[#FFD700] text-[#141414] font-bold px-4 py-1 rounded-full text-sm mb-4">
                {hero.badge}
              </span>
            )}
            <h1 className="text-4xl md:text-6xl font-bold mb-4 drop-shadow-lg">{hero.title}</h1>
            <p className="text-base md:text-lg text-white/90 mb-6 drop-shadow">
              {hero.description}
            </p>
            <div className="flex gap-3 flex-wrap">
              <button
                onClick={() => playMovie(hero)}
                className="px-6 py-3 rounded bg-white text-[#141414] font-semibold flex items-center gap-2 hover:bg-white/80 transition"
              >
                <Play className="w-5 h-5 fill-[#141414]" /> Play
              </button>
              <button className="px-6 py-3 rounded bg-white/20 text-white font-semibold flex items-center gap-2 hover:bg-white/10 transition">
                <Info className="w-5 h-5" /> More Info
              </button>
            </div>
          </div>

          {/* Carousel controls — prev / next arrows + dot indicators */}
          {heroPool.length > 1 && (
            <>
              <button
                type="button"
                onClick={goHeroPrev}
                aria-label="Previous featured movie"
                className="absolute left-3 md:left-6 top-1/2 -translate-y-1/2 w-11 h-11 md:w-12 md:h-12 rounded-full bg-black/50 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-sm transition opacity-0 group-hover/hero:opacity-100 focus-visible:opacity-100 z-20 ring-1 ring-white/10"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                type="button"
                onClick={goHeroNext}
                aria-label="Next featured movie"
                className="absolute right-3 md:right-6 top-1/2 -translate-y-1/2 w-11 h-11 md:w-12 md:h-12 rounded-full bg-black/50 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-sm transition opacity-0 group-hover/hero:opacity-100 focus-visible:opacity-100 z-20 ring-1 ring-white/10"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
              <div
                role="tablist"
                aria-label="Choose featured movie"
                className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 z-20 px-3 py-2 rounded-full bg-black/40 backdrop-blur-sm"
              >
                {heroPool.map((m, i) => {
                  const active = i === heroIndex;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      aria-label={`Show ${m.title}`}
                      onClick={() => setHeroIndex(i)}
                      className={`transition-all rounded-full ${
                        active
                          ? "w-6 h-2 bg-[#FFD700]"
                          : "w-2 h-2 bg-white/40 hover:bg-white/70"
                      }`}
                    />
                  );
                })}
              </div>
            </>
          )}
        </section>
      )}

      {/* Rows */}
      <section className="px-[4%] pb-12 -mt-20 relative z-10">
        {/* Subtle hint so users discover the new drag affordance. */}
        {categories.length > 0 && (
          <p className="text-xs text-white/50 mb-3 flex items-center gap-1.5">
            <GripVertical className="w-3 h-3" />
            Tip: drag any thumbnail to reorder it within its row.
          </p>
        )}
        {(() => {
          // Reference orderTick so this re-evaluates when any rail order changes.
          void orderTick;
          // Track which movies have already been shown so the same poster
          // never appears twice across the visible rails on the homepage.
          const seen = new Set<string>();
          return categories.map((cat) => {
          let list: Movie[];
          if (cat.virtual && cat.slug === "favorites") {
            // Virtual Favorites rail: viewer's hearted movies, in the order
            // they were added. Always show this rail at the top so users can
            // see it appear instantly when they hit the heart.
            const byId = new Map(movies.map((m) => [m.id, m]));
            list = favorites.map((id) => byId.get(id)).filter(Boolean) as Movie[];
          } else if (cat.virtual && cat.topTen) {
            // Virtual Top 10 rail: weighted rank across ALL movies.
            list = rankTopTen(movies, playCounts, railSettings, lastPlayed);
          } else if (cat.virtual && cat.slug === "continue") {
            // Virtual Continue Watching rail: built from this viewer's history.
            const played = movies.filter((m) => (playCounts[m.id] || 0) > 0);
            list = (
              railSettings.continueSort === "most_played"
                ? played.sort((a, b) => (playCounts[b.id] || 0) - (playCounts[a.id] || 0))
                : played.sort((a, b) => (lastPlayed[b.id] || 0) - (lastPlayed[a.id] || 0))
            ).slice(0, railSettings.continueMaxItems);
          } else {
            // Static rail (or virtual rail with no special handler): use assigned movies.
            list = moviesByCategory.get(cat.id) || [];
          }
          // Dedupe across rails so no thumbnail repeats on the page.
          // Favorites + Top 10 stay intact (they're meant to surface known
          // titles); other rails skip already-shown movies.
          const isPriorityRail =
            (cat.virtual && cat.slug === "favorites") || cat.topTen;
          if (!isPriorityRail) {
            list = list.filter((m) => !seen.has(m.id));
          }
          list.forEach((m) => seen.add(m.id));
          if (list.length === 0) return null;
          // Apply this viewer's saved drag order. Favorites uses its own
          // dedicated storage (the favorites array itself) so we skip the
          // generic rail-order layer there.
          const railKey = cat.id;
          const isFavoritesRail = cat.virtual && cat.slug === "favorites";
          if (!isFavoritesRail) {
            list = applyRailOrder(list, getRailOrder(railKey));
          }
          // Persist the new order on drop. Favorites updates the favorites
          // array itself so the heart-list stays in sync.
          const handleReorder = (newIds: string[]) => {
            if (isFavoritesRail) reorderFavorites(newIds);
            else setRailOrder(railKey, newIds);
          };
          if (cat.topTen) {
            return (
              <div key={cat.id} className="mb-10">
                <div className="flex items-baseline justify-between mb-3">
                  <h2 className="text-xl md:text-2xl font-semibold">{cat.name}</h2>
                  <span className="text-xs text-white/50 uppercase tracking-wider">Updated weekly</span>
                </div>
                <SortableRail
                  items={list.map((m, idx) => ({ m, idx }))}
                  getId={(it) => it.m.id}
                  onReorder={(newIds) => handleReorder(newIds)}
                  containerClassName="flex gap-2 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-[#FFD700] scrollbar-track-[#2a2a2a]"
                  renderItem={(it, handle, style) => (
                    <div
                      ref={handle.ref}
                      style={style}
                      {...(handle.attributes ?? {})}
                      className={`group flex-none flex items-end gap-0 text-left transition-transform duration-200 hover:scale-[1.04] hover:z-10 relative ${
                        handle.isOver ? "ring-2 ring-[#FFD700] rounded-md" : ""
                      }`}
                    >
                      {handle.insertionSide && (
                        <span
                          aria-hidden
                          className={`pointer-events-none absolute top-2 bottom-2 w-1 rounded-full bg-[#FFD700] shadow-[0_0_12px_rgba(255,215,0,0.95)] animate-pulse z-30 ${
                            handle.insertionSide === "left" ? "-left-1" : "-right-1"
                          }`}
                        />
                      )}
                      <span
                        className="text-[110px] md:text-[160px] leading-none font-black text-transparent select-none"
                        style={{
                          WebkitTextStroke: "3px #FFD700",
                          textShadow: "0 4px 30px rgba(0,0,0,0.6)",
                        }}
                        aria-hidden
                      >
                        {it.idx + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => playMovie(it.m)}
                        aria-label={`Play ${it.m.title}`}
                        className="w-[120px] sm:w-[150px] md:w-[170px] aspect-[2/3] -ml-6 md:-ml-8 rounded-md overflow-hidden bg-[#2a2a2a] shadow-lg block"
                      >
                        {it.m.poster ? (
                          <img
                            src={resolveMediaUrl(it.m.poster)}
                            alt={it.m.title}
                            loading="lazy"
                            onError={(e) => {
                              const img = e.currentTarget;
                              const fb = getFallbackArtForTitle(it.m.title).poster;
                              if (img.src !== fb) img.src = fb;
                            }}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <img
                            src={getFallbackArtForTitle(it.m.title).poster}
                            alt={it.m.title}
                            loading="lazy"
                            className="w-full h-full object-cover"
                          />
                        )}
                      </button>
                      <button
                        type="button"
                        {...(handle.listeners ?? {})}
                        aria-label={`Drag ${it.m.title} to reorder`}
                        title="Drag to reorder"
                        onClick={(e) => e.stopPropagation()}
                        className="absolute top-2 right-2 w-9 h-9 rounded-full flex items-center justify-center bg-black/70 hover:bg-black/90 text-white backdrop-blur-sm cursor-grab active:cursor-grabbing touch-none z-10 opacity-100 md:opacity-0 md:group-hover:opacity-100 focus-visible:opacity-100 transition-opacity shadow-md ring-1 ring-white/10"
                      >
                        <GripVertical className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                />
              </div>
            );
          }
          return (
            <div key={cat.id} className="mb-10">
              <div className="flex items-baseline justify-between mb-3">
                <h2 className="text-xl md:text-2xl font-semibold">{cat.name}</h2>
                <a href="#" className="text-sm text-[#FFD700] hover:underline">
                  View All
                </a>
              </div>
              <SortableRail
                items={list}
                getId={(m) => m.id}
                onReorder={handleReorder}
                containerClassName="flex gap-3 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-[#FFD700] scrollbar-track-[#2a2a2a]"
                renderItem={(m, handle, style) => (
                  <Card
                    movie={m}
                    onPlay={() => playMovie(m)}
                    isFav={favSet.has(m.id)}
                    onToggleFav={() => toggleFavorite(m.id)}
                    dragHandle={handle}
                    style={style}
                  />
                )}
              />
            </div>
          );
          });
        })()}

        {categories.length === 0 && (
          <div className="text-center py-20 text-white/60">
            No categories yet. Open the{" "}
            <Link to="/cms/categories" className="text-[#FFD700] underline">
              CMS
            </Link>{" "}
            to add some.
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="px-[4%] py-12 border-t border-white/10 mt-8 text-white/60 text-sm">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
          <div className="flex flex-col gap-2">
            <a href="#" className="hover:text-[#FFD700]">Audio and Subtitles</a>
            <a href="#" className="hover:text-[#FFD700]">Media Center</a>
            <a href="#" className="hover:text-[#FFD700]">Privacy</a>
            <a href="#" className="hover:text-[#FFD700]">Contact Us</a>
          </div>
          <div className="flex flex-col gap-2">
            <a href="#" className="hover:text-[#FFD700]">Audio Description</a>
            <a href="#" className="hover:text-[#FFD700]">Investor Relations</a>
            <a href="#" className="hover:text-[#FFD700]">Legal Notices</a>
          </div>
          <div className="flex flex-col gap-2">
            <a href="#" className="hover:text-[#FFD700]">Help Center</a>
            <a href="#" className="hover:text-[#FFD700]">Jobs</a>
            <a href="#" className="hover:text-[#FFD700]">Cookie Preferences</a>
          </div>
          <div className="flex flex-col gap-2">
            <a href="#" className="hover:text-[#FFD700]">Gift Cards</a>
            <a href="#" className="hover:text-[#FFD700]">Terms of Use</a>
            <a href="#" className="hover:text-[#FFD700]">Corporate Information</a>
          </div>
        </div>
        <p className="text-xs">
          © {new Date().getFullYear()} SmileFlex, Inc. All rights reserved. Built with ❤️ for endless entertainment.
        </p>
      </footer>

      {playing && <PlayerModal movie={playing} onClose={() => setPlaying(null)} />}
      {showIntro && <IntroOverlay onDone={dismissIntro} />}
      <SearchOverlay
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        onPlay={(m) => playMovie(m)}
      />
    </div>
  );
}