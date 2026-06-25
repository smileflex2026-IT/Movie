export type Role = "admin" | "editor";

import { slugify } from "./slug";
import { getArtForTitle } from "./movie-art";

/** Make a unique slug across the given movies list (excluding optional id). */
export const makeUniqueSlug = (title: string, movies: Movie[], excludeId?: string): string => {
  const base = slugify(title) || "movie";
  let slug = base;
  let n = 2;
  const taken = new Set(movies.filter((m) => m.id !== excludeId).map((m) => m.slug));
  while (taken.has(slug)) slug = `${base}-${n++}`;
  return slug;
};

export interface User {
  id: string;
  email: string;
  password: string;
  role: Role;
}

export interface CurrentUser {
  id: string;
  email: string;
  role: Role;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  order: number;
  topTen?: boolean;
  /**
   * When true, this rail's items are computed at runtime instead of pulled
   * from movies whose `categoryId` matches. Top 10 and Continue Watching
   * default to virtual.
   */
  virtual?: boolean;
}

export type AdType = "preroll" | "midroll" | "endroll";

export interface Ad {
  type: AdType;
  url: string;
  timestamp?: number;
  skipAfter: number;
}

export interface Movie {
  id: string;
  title: string;
  slug: string;
  description: string;
  poster: string;
  backdrop: string;
  video: string;
  duration: number;
  categoryId: string;
  published: boolean;
  ads: Ad[];
  createdAt: string;
  year?: number;
  rating?: number;
  featured?: boolean;
  badge?: string;
  weeklyTrendingRank?: number;
}

const KEYS = {
  USERS: "smileflex_users",
  CURRENT_USER: "smileflex_current_user",
  MOVIES: "smileflex_movies",
  CATEGORIES: "smileflex_categories",
  SCHEMA: "smileflex_schema_version",
  PLAY_COUNTS: "smileflex_play_counts",
  LAST_PLAYED: "smileflex_last_played",
} as const;

const SCHEMA_VERSION = "10";

export const generateId = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

const read = <T,>(k: string, fallback: T): T => {
  try {
    const v = localStorage.getItem(k);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
};

const write = (k: string, v: unknown) => localStorage.setItem(k, JSON.stringify(v));

export function initSeedData() {
  // Reset seed data when schema changes so the frontend stays aligned with the CMS structure.
  if (localStorage.getItem(KEYS.SCHEMA) !== SCHEMA_VERSION) {
    localStorage.removeItem(KEYS.CATEGORIES);
    localStorage.removeItem(KEYS.MOVIES);
    localStorage.setItem(KEYS.SCHEMA, SCHEMA_VERSION);
  }
  if (!localStorage.getItem(KEYS.USERS)) {
    const users: User[] = [
      { id: "1", email: "admin@smileflex.com", password: "admin123", role: "admin" },
      { id: "2", email: "editor@smileflex.com", password: "editor123", role: "editor" },
    ];
    write(KEYS.USERS, users);
  }
  if (!localStorage.getItem(KEYS.CATEGORIES)) {
    const cats: Category[] = [
      { id: "10", name: "My Favorites", slug: "favorites", order: 1, virtual: true },
      { id: "1", name: "Trending Now", slug: "trending", order: 2 },
      { id: "2", name: "SmileFlex Originals", slug: "originals", order: 3 },
      { id: "9", name: "Top 10 This Week", slug: "top-10", order: 4, topTen: true, virtual: true },
      { id: "3", name: "Popular on SmileFlex", slug: "popular", order: 5 },
      { id: "4", name: "Comedy Classics", slug: "comedy", order: 6 },
      { id: "5", name: "Drama Series", slug: "drama", order: 7 },
      { id: "6", name: "Action Packed", slug: "action", order: 8 },
      { id: "7", name: "Romantic Stories", slug: "romance", order: 9 },
      { id: "8", name: "Continue Watching for You", slug: "continue", order: 10, virtual: true },
      // ---- New themed rails (added in schema v10) ----
      { id: "20", name: "AI Generated Movies", slug: "ai-generated", order: 11 },
      { id: "21", name: "Travel and Tours", slug: "travel-tours", order: 12 },
      { id: "22", name: "Documentary", slug: "documentary", order: 13 },
      { id: "23", name: "Sci-Fi", slug: "sci-fi", order: 14 },
      { id: "24", name: "K Drama", slug: "k-drama", order: 15 },
      { id: "25", name: "Filipino Drama", slug: "filipino-drama", order: 16 },
      { id: "26", name: "Hollywood", slug: "hollywood", order: 17 },
      { id: "27", name: "2026", slug: "2026", order: 18 },
      { id: "28", name: "Movie Trailer", slug: "movie-trailer", order: 19 },
      { id: "29", name: "Movie Magic", slug: "movie-magic", order: 20 },
      { id: "30", name: "Short Movies", slug: "short-movies", order: 21 },
      { id: "31", name: "All Vertical", slug: "all-vertical", order: 22 },
      { id: "32", name: "Futurism", slug: "futurism", order: 23 },
      { id: "33", name: "Pop Culture", slug: "pop-culture", order: 24 },
      { id: "34", name: "Star Wars and Star Trek", slug: "star-wars-star-trek", order: 25 },
      { id: "35", name: "Biopick", slug: "biopick", order: 26 },
      { id: "36", name: "The Founders", slug: "the-founders", order: 27 },
      { id: "37", name: "The Billionaires", slug: "the-billionaires", order: 28 },
      { id: "38", name: "Elon Musk", slug: "elon-musk", order: 29 },
      { id: "39", name: "AI Renaissance", slug: "ai-renaissance", order: 30 },
    ];
    write(KEYS.CATEGORIES, cats);
  }
  if (!localStorage.getItem(KEYS.MOVIES)) {
    const SAMPLE = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";
    const now = new Date().toISOString();

    // Per-category title pools — each title is UNIQUE across categories,
    // and chosen to fit the category's theme. (Top 10 + Continue Watching
    // are virtual rails that reuse movies from other categories at runtime.)
    const titlesByCat: Record<string, string[]> = {
      // Trending Now — current/recent buzzy blockbusters
      "1": ["Oppenheimer","Dune: Part Two","Barbie","Killers of the Flower Moon","Poor Things","The Holdovers","Wonka","Saltburn","Anatomy of a Fall","Past Lives","Maestro","American Fiction","Civil War","Furiosa","Challengers","Mission: Impossible — Dead Reckoning","Migration","The Boys in the Boat","Argylle","Aquaman and the Lost Kingdom","Madame Web","Bob Marley: One Love"],
      // SmileFlex Originals — fictional in-house brand titles
      "2": ["Smile Therapy","Project Sunrise","Echoes of Tomorrow","The Last Lighthouse","Neon Nights","Velvet Skies","Paper Cranes","Ironwood","The Glass Garden","Midnight Static","Crimson Hour","Kindred","Northwind","The Cartographer","Solace","Aurora Drive","Halcyon","The Quiet Letter","Wildflower","Saltwater","Lantern","Ember"],
      // Popular on SmileFlex — long-running global hits & series
      "3": ["Stranger Things","Money Heist","The Crown","Wednesday","Squid Game","Bridgerton","Dark","Ozark","Lupin","The Witcher","Narcos","Peaky Blinders","Cobra Kai","Lucifer","You","Manifest","Shadow and Bone","Arcane","Heartstopper","Vikings","The Sandman","Locke & Key"],
      // Comedy Classics — beloved sitcoms / comedy films
      "4": ["The Office","Friends","Seinfeld","Brooklyn Nine-Nine","Parks and Recreation","Modern Family","Ted Lasso","Community","Arrested Development","30 Rock","How I Met Your Mother","The Big Bang Theory","Schitt's Creek","Curb Your Enthusiasm","Frasier","Cheers","Scrubs","It's Always Sunny in Philadelphia","Silicon Valley","New Girl","Veep","The Good Place"],
      // Drama Series — prestige dramas (TV + film)
      "5": ["Breaking Bad","Better Call Saul","The Sopranos","Mad Men","Succession","The Wire","Game of Thrones","House of the Dragon","This Is Us","The Pianist","A Beautiful Mind","12 Years a Slave","Manchester by the Sea","The Shawshank Redemption","Marriage Story","Whiplash","Dead Poets Society","The Green Mile","Forrest Gump","The Godfather","Schindler's List","There Will Be Blood"],
      // Action Packed — pure action films
      "6": ["Mad Max: Fury Road","John Wick: Chapter 4","Extraction","The Raid","Heat","Die Hard","Bullet Train","The Equalizer","Sicario","Black Hawk Down","Atomic Blonde","Casino Royale","Skyfall","The Bourne Identity","Mission Impossible: Fallout","Edge of Tomorrow","Kingsman: The Secret Service","Nobody","Wrath of Man","Hardcore Henry","Triple Frontier","Polar"],
      // Romantic Stories — romance films
      "7": ["La La Land","Pride & Prejudice","The Notebook","Notting Hill","About Time","Call Me by Your Name","Before Sunrise","500 Days of Summer","Crazy Rich Asians","To All the Boys I've Loved Before","Eternal Sunshine of the Spotless Mind","The Theory of Everything","Atonement","One Day","Me Before You","P.S. I Love You","Sense and Sensibility","Brooklyn","Carol","Anyone But You","Roman Holiday","Sleepless in Seattle"],
      // Continue Watching — VIRTUAL rail. Seeded empty; populated at runtime
      // from each viewer's actual play history.
      "8": [],
      // Top 10 This Week — VIRTUAL rail. Seeded empty; computed at runtime
      // from weeklyTrendingRank + play counts across all movies.
      "9": [],
      // ---- New rails (schema v10): each title is unique to its rail ----
      // AI Generated Movies (cat 20)
      "20": ["Neural Dreams","Synthetic Souls","Prompt: Genesis","The Latent Space","Diffusion","Hallucination Engine","Token Storm","Generative Eve","Model Collapse","Silicon Muse"],
      // Travel and Tours (cat 21)
      "21": ["Wanderlust: Patagonia","Streets of Tokyo","Kyoto in Bloom","Marrakech Nights","Lisbon Trams","Reykjavik Aurora","Bali Sunrise","Cairo to Aswan","Trans-Siberian","Andes Skyway"],
      // Documentary (cat 22)
      "22": ["Our Living Oceans","The Bee Whisperers","Inside the Vatican Archives","City Beneath the Sand","Frozen Frontier","The Last Glassblower","Voices of the Sahel","Coral Awakening","Behind the Curtain","Streetlight Symphony"],
      // Sci-Fi (cat 23)
      "23": ["Quantum Drift","The Mars Cycle","Hollow Sun","Lightyear Pact","Andromeda Protocol","The Vacuum","Iron Halo","Children of the Void","Black Comet","Singularity Bay"],
      // K Drama (cat 24)
      "24": ["Seoul After Midnight","Han River Letters","Crash Course Romance","Pojangmacha Hearts","The Chairman's Niece","Hallyu High","Camellia Days","Wolf in Hanbok","My Time-Traveling Boss","Gangnam Goodbye"],
      // Filipino Drama (cat 25)
      "25": ["Liwanag sa Dagat","Pinto ng Pag-asa","Hanggang Sa Muli","Anak ng Manila","Bahay sa Bukid","Salamin ng Buhay","Tahanan","Bituin sa Umaga","Probinsyana","Pangako sa Tag-ulan"],
      // Hollywood (cat 26)
      "26": ["Sunset & Vine","Boulevard of Lights","The Studio Lot","Hills of Gold","Premiere Night","Hollywood Heist","Backlot Secrets","The Talent Agent","Walk of Fame","Last Reel"],
      // 2026 (cat 27)
      "27": ["Avatar: Fire and Ash","Dune: Messiah","The Batman Part II","Star Wars: Starfighter","Spider-Man: Brand New Day","Toy Story 5","Ice Age 6","Project Hail Mary","Mickey 17 Returns","Shrek 5"],
      // Movie Trailer (cat 28)
      "28": ["Trailer Reel: Summer 2026","Trailer Reel: Winter Blockbusters","Trailer Reel: Indie Spotlight","Trailer Reel: Animation","Trailer Reel: Horror Nights","Trailer Reel: Action Pack","Trailer Reel: Sci-Fi Sneak","Trailer Reel: Romance Picks"],
      // Movie Magic (cat 29)
      "29": ["The Art of VFX","Practical Effects Masters","Inside Industrial Light","Stunt Choreography","Building Worlds","Creature Shop","Sound of Cinema","Color in Motion"],
      // Short Movies (cat 30)
      "30": ["Paper Boats","One Minute","The Lift","Last Bus Home","Coffee at Six","Two Strangers","The Window Seat","Postcard","Echo","Static"],
      // All Vertical (cat 31)
      "31": ["Vertical: Subway Sketches","Vertical: Skyline Loops","Vertical: Street Eats","Vertical: Pet Diaries","Vertical: Morning Rush","Vertical: Festival Lights","Vertical: Studio Sessions","Vertical: Coastline"],
      // Futurism (cat 32)
      "32": ["Cities of 2099","The Mind Uploaded","Post-Carbon","Asteroid Workers","Holo-Vegas","The Dyson Choir","Carbon Cathedrals","Megastructure"],
      // Pop Culture (cat 33)
      "33": ["The Fandom Tapes","Memeology","Stan Wars","Internet Royalty","Cosplay Kingdom","Streamer Saga","Viral","Pop Pulse"],
      // Star Wars and Star Trek (cat 34)
      "34": ["Skywalker Legacy","Knights of the Republic","Rogue Pilot","The Mandalorian Path","Federation Dawn","Voyager Returns","Klingon Honor","Borg Frontier"],
      // Biopick (cat 35)
      "35": ["Mandela: The Long Walk","Curie","Chaplin","Gandhi: Salt March","Frida","Bowie: Stardust","Ali","Rizal: A Nation's Pen"],
      // The Founders (cat 36)
      "36": ["Garage Days","The Lean Startup Story","Founders' Table","Pivot","Series A","Bootstrapped","The Pitch Room","Day One"],
      // The Billionaires (cat 37)
      "37": ["Bezos: From Garage to Orbit","Buffett: Oracle of Omaha","Gates: Code & Cure","Slim: Empire of Wires","Arnault: House of Luxury","Murdoch: Headlines","Adani: The Ports","Ambani: Reliance"],
      // Elon Musk (cat 38)
      "38": ["Musk: PayPal Mafia","Tesla: Roadster Bet","SpaceX: Falcon Rising","Starship: To Mars","Neuralink: Mind & Machine","The Boring Company","X: The Everything App","Grok: Inside xAI"],
      // AI Renaissance (cat 39)
      "39": ["The Transformer Era","Attention Is All You Need","ChatGPT: A Year One","Midjourney: Painting with Words","The Open-Source Wave","Agents at Work","AGI Question","After the Singularity"],
    };

    const descByCat: Record<string, string[]> = {
      "1": ["A blockbuster spectacle that everyone is talking about right now.", "Climbing the charts with breathtaking visuals and a story to match.", "The cultural moment of the season — don't miss it."],
      "2": ["A SmileFlex Original crafted with heart, humor, and unforgettable characters.", "An exclusive new release made just for SmileFlex viewers.", "A fresh original that pushes storytelling in bold new directions."],
      "3": ["A worldwide phenomenon loved by millions of SmileFlex viewers.", "A binge-worthy hit that keeps making the top-ten list.", "Universally adored — once you start, you won't stop."],
      "4": ["Laugh-out-loud comedy that never gets old, no matter how many times you watch.", "A timeless comedy classic packed with quotable moments.", "The perfect feel-good pick for any night in."],
      "5": ["A powerful drama with performances that linger long after the credits.", "Layered storytelling and emotional depth at its finest.", "A character-driven journey that earns every tear."],
      "6": ["Pulse-pounding action from the very first frame to the last.", "Explosive set pieces and relentless momentum throughout.", "Pure adrenaline — buckle up and hit play."],
      "7": ["A tender love story that proves the heart still rules the screen.", "Sweeping romance with chemistry that crackles in every scene.", "Equal parts heartbreak and hope — a true romantic gem."],
      "8": ["Pick up right where you left off — your story is waiting."],
      "9": ["A weekly trending pick on SmileFlex."],
      "20": ["A wholly AI-generated feature exploring imagined worlds.","Crafted frame-by-frame by generative models.","An experimental film born from prompts and pixels."],
      "21": ["Stunning travelogue across breathtaking destinations.","A cinematic guided tour for armchair adventurers.","Discover hidden corners of the world in 4K."],
      "22": ["A meticulously researched documentary on a vital subject.","Real stories, real people, told with cinematic care.","An eye-opening look at the world around us."],
      "23": ["Hard sci-fi with big ideas and bigger horizons.","A future-set thriller that asks what makes us human.","Space, time, and the spaces between."],
      "24": ["A swoon-worthy K-drama with chemistry that lingers.","Heartfelt, stylish, and perfectly bingeable.","Romance, family, and unforgettable twists."],
      "25": ["A gripping Filipino drama close to the heart.","Pamilya, pag-ibig, at pag-asa sa isang kuwento.","Relatable, raw, and rooted in everyday life."],
      "26": ["A glossy Hollywood production with star power and spectacle.","Big budgets, bigger names, blockbuster fun.","Pure tinseltown magic on the big screen."],
      "27": ["One of the most anticipated releases of 2026.","Mark your calendar — this 2026 release is the talk of the town.","A 2026 tentpole that's redefining its genre."],
      "28": ["An official trailer reel showcasing what's coming next.","Watch the trailer drop in cinematic quality.","Sneak peeks at the films everyone will be talking about."],
      "29": ["A behind-the-scenes look at how the magic is made.","From storyboard to screen — the craft of cinema revealed.","Meet the artists who turn impossible into image."],
      "30": ["A tightly crafted short film with an outsized punch.","Big stories told in small runtimes.","Festival-circuit shorts in one place."],
      "31": ["Shot vertical-first for the small screen.","Made for mobile, designed to scroll.","A vertical-format experience optimized for phones."],
      "32": ["A speculative look at the worlds we might inhabit.","Futurist storytelling at its boldest.","Tomorrow's possibilities, dramatized today."],
      "33": ["A pulse-check on the moments and memes shaping culture.","Pop culture, decoded with style and wit.","From fandom to phenomenon."],
      "34": ["For fans of a galaxy far, far away — and beyond.","Lightsabers, starships, and the final frontier.","The space-opera epics that defined generations."],
      "35": ["A faithful biographical portrait of an extraordinary life.","A biopic that captures the spirit behind the legend.","The definitive screen telling of a real-life icon."],
      "36": ["The origin stories of the people who built what we use.","Inside the late nights and bold bets that made companies.","A founder's-eye view of building from zero."],
      "37": ["Up close with the world's most influential fortunes.","How empires of capital are built — and challenged.","Profiles of the wealth that shapes the modern world."],
      "38": ["An in-depth look at one of the most polarizing entrepreneurs.","From PayPal to Mars — the Musk timeline.","The bets, breakthroughs, and battles of Elon Musk."],
      "39": ["A chronicle of the AI breakthroughs reshaping every industry.","Inside the renaissance of artificial intelligence.","The labs, the models, the people behind the AI boom."],
    };

    const movies: Movie[] = [];
    let nid = 1;

    for (const [catId, titles] of Object.entries(titlesByCat)) {
      const descs = descByCat[catId];
      titles.forEach((title, i) => {
        const art = getArtForTitle(title);
        const id = String(nid++);
        movies.push({
          id,
          title,
          slug: slugify(title) + "-" + id,
          description: descs[i % descs.length],
          poster: art.poster,
          backdrop: art.backdrop,
          video: SAMPLE,
          duration: 90 + ((i * 7) % 60),
          categoryId: catId,
          published: true,
          ads: [],
          createdAt: now,
          year: 1994 + ((i * 3) % 31),
          rating: Math.round((6.5 + ((i * 0.37) % 3)) * 10) / 10,
          featured: title === "Smile Therapy" && catId === "2",
          badge: title === "Smile Therapy" && catId === "2" ? "#1 SmileFlex Original" : "",
          weeklyTrendingRank: catId === "1" && i < 10 ? i + 1 : undefined,
        });
      });
    }

    // Mark the top 10 trending picks (by category "1" order) with weeklyTrendingRank
    // so the virtual Top 10 rail has data immediately. NO cloning — every movie
    // remains unique and lives in exactly one category.
    movies
      .filter((m) => m.categoryId === "1")
      .slice(0, 10)
      .forEach((m, i) => {
        m.weeklyTrendingRank = i + 1;
      });

    write(KEYS.MOVIES, movies);
  }
}

export const getUsers = () => read<User[]>(KEYS.USERS, []);
export const setUsers = (u: User[]) => write(KEYS.USERS, u);

export const getCurrentUser = () => read<CurrentUser | null>(KEYS.CURRENT_USER, null);
export const setCurrentUser = (u: CurrentUser | null) => {
  if (u) write(KEYS.CURRENT_USER, u);
  else localStorage.removeItem(KEYS.CURRENT_USER);
};

export const getMovies = () => read<Movie[]>(KEYS.MOVIES, []);
export const setMovies = (m: Movie[]) => write(KEYS.MOVIES, m);

export const getCategories = () => read<Category[]>(KEYS.CATEGORIES, []);
export const setCategories = (c: Category[]) => write(KEYS.CATEGORIES, c);

// --- Play counts (auto-tracking for Top 10) ---
export const getPlayCounts = () => read<Record<string, number>>(KEYS.PLAY_COUNTS, {});
export const getLastPlayed = () => read<Record<string, number>>(KEYS.LAST_PLAYED, {});
export const incrementPlayCount = (movieId: string) => {
  const counts = getPlayCounts();
  counts[movieId] = (counts[movieId] || 0) + 1;
  write(KEYS.PLAY_COUNTS, counts);

  const last = getLastPlayed();
  last[movieId] = Date.now();
  write(KEYS.LAST_PLAYED, last);
};

import type { RailSettings } from "./rail-settings";
import { DEFAULT_RAIL_SETTINGS } from "./rail-settings";

/**
 * Score a single movie for the Top 10 rail. Higher = better.
 * Combines three signals weighted by RailSettings:
 *   1. Manual `weeklyTrendingRank` (1 = best, 10 = worst). Converted to (11 - rank).
 *   2. Play count (raw count from local play tracker).
 *   3. Recency: exponential decay with configurable half-life.
 * Each signal is normalized 0..1 across the input set so the weights stay comparable.
 */
const scoreMovie = (
  m: Movie,
  counts: Record<string, number>,
  lastPlayed: Record<string, number>,
  s: RailSettings,
  maxPlayCount: number,
  now: number,
): number => {
  // 1. Manual rank: rank 1..10 → score 1.0..0.1; missing → 0
  const manual = m.weeklyTrendingRank
    ? Math.max(0, (11 - m.weeklyTrendingRank) / 10)
    : 0;
  // 2. Play count: normalized to maxPlayCount across the pool
  const plays = maxPlayCount > 0 ? (counts[m.id] || 0) / maxPlayCount : 0;
  // 3. Recency: exp(-ln2 * ageDays / halfLife). Never-played → 0.
  const last = lastPlayed[m.id];
  const halfLife = Math.max(1, s.top10RecencyHalfLifeDays);
  const recency = last
    ? Math.pow(0.5, (now - last) / (halfLife * 86_400_000))
    : 0;
  return (
    s.top10WeightManualRank * manual +
    s.top10WeightPlayCount * plays +
    s.top10WeightRecency * recency
  );
};

/**
 * Rank movies for a Top 10 row using the active RailSettings.
 * Settings are optional — defaults preserve sensible behavior.
 */
export const rankTopTen = (
  movies: Movie[],
  counts: Record<string, number>,
  settings: RailSettings = DEFAULT_RAIL_SETTINGS,
  lastPlayed: Record<string, number> = {},
): Movie[] => {
  const maxPlay = movies.reduce((m, x) => Math.max(m, counts[x.id] || 0), 0);
  const now = Date.now();
  return [...movies]
    .map((m) => ({ m, s: scoreMovie(m, counts, lastPlayed, settings, maxPlay, now) }))
    .sort((a, b) => b.s - a.s)
    .slice(0, 10)
    .map((x) => x.m);
};
