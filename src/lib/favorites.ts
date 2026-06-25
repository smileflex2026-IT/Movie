/**
 * Per-viewer favorites — stored in localStorage. The Home page reads these
 * to populate the virtual "My Favorites" rail. Other tabs/components react
 * via the "favorites:changed" event + the native "storage" event.
 */
const KEY = "smileflex_favorites";
const EVT = "favorites:changed";

const read = (): string[] => {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
};

const write = (ids: string[]) => {
  localStorage.setItem(KEY, JSON.stringify(ids));
  window.dispatchEvent(new CustomEvent(EVT));
};

export const getFavorites = (): string[] => read();

export const isFavorite = (movieId: string): boolean =>
  read().includes(movieId);

export const toggleFavorite = (movieId: string): boolean => {
  const cur = read();
  const i = cur.indexOf(movieId);
  if (i >= 0) {
    cur.splice(i, 1);
    write(cur);
    return false;
  }
  cur.push(movieId);
  write(cur);
  return true;
};

/** Remove a single movie from favorites. No-op if not favorited. */
export const removeFavorite = (movieId: string): void => {
  const cur = read();
  const next = cur.filter((id) => id !== movieId);
  if (next.length !== cur.length) write(next);
};

/** Wipe all favorites for this viewer. */
export const clearFavorites = (): void => {
  write([]);
};

/**
 * Replace the favorites order. Filters to the current set so a stale id list
 * (e.g. after a removal in another tab) can't accidentally re-add an
 * unfavorited movie or drop a favorited one.
 */
export const reorderFavorites = (ids: string[]): void => {
  const curList = read();
  const cur = new Set(curList);
  const next = ids.filter((id) => cur.has(id));
  for (const id of curList) if (!next.includes(id)) next.push(id);
  write(next);
};

/** Subscribe to favorites changes (same tab + cross-tab). */
export const onFavoritesChange = (cb: () => void): (() => void) => {
  const onEvt = () => cb();
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) cb();
  };
  window.addEventListener(EVT, onEvt);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(EVT, onEvt);
    window.removeEventListener("storage", onStorage);
  };
};
