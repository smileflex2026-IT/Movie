/**
 * Lightweight string similarity helpers for duplicate/near-duplicate detection.
 * Uses Dice coefficient on character bigrams — fast and good for short titles.
 */

const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const bigrams = (s: string): Map<string, number> => {
  const map = new Map<string, number>();
  const t = ` ${s} `;
  for (let i = 0; i < t.length - 1; i++) {
    const b = t.slice(i, i + 2);
    map.set(b, (map.get(b) || 0) + 1);
  }
  return map;
};

/** Dice coefficient between 0 (different) and 1 (identical) on normalized strings. */
export const similarity = (a: string, b: string): number => {
  const na = normalize(a);
  const nb = normalize(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  const ba = bigrams(na);
  const bb = bigrams(nb);
  let overlap = 0;
  let total = 0;
  ba.forEach((v) => (total += v));
  bb.forEach((v) => (total += v));
  ba.forEach((v, k) => {
    const o = bb.get(k);
    if (o) overlap += Math.min(v, o);
  });
  return total === 0 ? 0 : (2 * overlap) / total;
};

export interface SimilarMatch<T> {
  item: T;
  score: number;
  exact: boolean;
}

/** Find items whose `title` is similar to the query above the given threshold. */
export const findSimilar = <T extends { id: string; title: string }>(
  query: string,
  items: T[],
  opts: { excludeId?: string; threshold?: number; limit?: number } = {}
): SimilarMatch<T>[] => {
  const { excludeId, threshold = 0.7, limit = 5 } = opts;
  const nq = normalize(query);
  if (!nq) return [];
  const out: SimilarMatch<T>[] = [];
  for (const item of items) {
    if (item.id === excludeId) continue;
    const score = similarity(query, item.title);
    if (score >= threshold) out.push({ item, score, exact: normalize(item.title) === nq });
  }
  out.sort((a, b) => b.score - a.score);
  return out.slice(0, limit);
};