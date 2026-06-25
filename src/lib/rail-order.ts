/**
 * Per-viewer custom rail ordering — stored in localStorage.
 *
 * Each category gets an array of movie IDs representing the user's preferred
 * order. Unknown/new movies fall to the end. Anything not in the saved list
 * keeps the source order it was in.
 *
 * Cross-tab + same-tab updates are broadcast via the "rail-order:changed"
 * event + the native "storage" event.
 */
const KEY = "smileflex_rail_order";
const EVT = "rail-order:changed";

type OrderMap = Record<string, string[]>;

const read = (): OrderMap => {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const v = JSON.parse(raw);
    return v && typeof v === "object" && !Array.isArray(v) ? v : {};
  } catch {
    return {};
  }
};

const writeMap = (m: OrderMap) => {
  localStorage.setItem(KEY, JSON.stringify(m));
  window.dispatchEvent(new CustomEvent(EVT));
};

export const getRailOrder = (railKey: string): string[] => read()[railKey] ?? [];

export const setRailOrder = (railKey: string, ids: string[]): void => {
  const cur = read();
  cur[railKey] = ids;
  writeMap(cur);
};

export const clearRailOrder = (railKey: string): void => {
  const cur = read();
  if (cur[railKey]) {
    delete cur[railKey];
    writeMap(cur);
  }
};

/**
 * Apply a saved order to a list of movies. Saved IDs come first (in saved
 * order), then any remaining movies stay in their original relative order.
 */
export const applyRailOrder = <T extends { id: string }>(
  items: T[],
  savedOrder: string[],
): T[] => {
  if (savedOrder.length === 0) return items;
  const byId = new Map(items.map((i) => [i.id, i]));
  const seen = new Set<string>();
  const out: T[] = [];
  for (const id of savedOrder) {
    const hit = byId.get(id);
    if (hit && !seen.has(id)) {
      out.push(hit);
      seen.add(id);
    }
  }
  for (const it of items) if (!seen.has(it.id)) out.push(it);
  return out;
};

export const onRailOrderChange = (cb: () => void): (() => void) => {
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
