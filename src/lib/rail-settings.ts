import { supabase } from "@/integrations/supabase/client";

export interface RailSettings {
  top10WeightManualRank: number;
  top10WeightPlayCount: number;
  top10WeightRecency: number;
  top10RecencyHalfLifeDays: number;
  continueMaxItems: number;
  continueSort: "recent" | "most_played";
}

export const DEFAULT_RAIL_SETTINGS: RailSettings = {
  top10WeightManualRank: 1.0,
  top10WeightPlayCount: 1.0,
  top10WeightRecency: 0.5,
  top10RecencyHalfLifeDays: 7,
  continueMaxItems: 20,
  continueSort: "recent",
};

const CACHE_KEY = "smileflex_rail_settings";

const fromRow = (r: Record<string, unknown>): RailSettings => ({
  top10WeightManualRank: Number(r.top10_weight_manual_rank ?? 1),
  top10WeightPlayCount: Number(r.top10_weight_play_count ?? 1),
  top10WeightRecency: Number(r.top10_weight_recency ?? 0.5),
  top10RecencyHalfLifeDays: Number(r.top10_recency_half_life_days ?? 7),
  continueMaxItems: Number(r.continue_max_items ?? 20),
  continueSort: (r.continue_sort as "recent" | "most_played") ?? "recent",
});

const toRow = (s: RailSettings) => ({
  top10_weight_manual_rank: s.top10WeightManualRank,
  top10_weight_play_count: s.top10WeightPlayCount,
  top10_weight_recency: s.top10WeightRecency,
  top10_recency_half_life_days: Math.max(1, Math.round(s.top10RecencyHalfLifeDays)),
  continue_max_items: Math.max(1, Math.round(s.continueMaxItems)),
  continue_sort: s.continueSort,
});

/** Synchronous read of the cached settings. Use as initial UI state. */
export function getCachedRailSettings(): RailSettings {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) return { ...DEFAULT_RAIL_SETTINGS, ...JSON.parse(raw) };
  } catch {/* ignore */}
  return DEFAULT_RAIL_SETTINGS;
}

/** Fetch from Supabase, refresh local cache, return latest. */
export async function fetchRailSettings(): Promise<RailSettings> {
  const { data, error } = await supabase
    .from("rail_settings")
    .select("*")
    .eq("id", "global")
    .maybeSingle();
  if (error || !data) return getCachedRailSettings();
  const parsed = fromRow(data as Record<string, unknown>);
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(parsed)); } catch {/* ignore */}
  return parsed;
}

/** Persist settings (CMS-staff only via RLS). */
export async function saveRailSettings(s: RailSettings): Promise<void> {
  const { error } = await supabase
    .from("rail_settings")
    .update(toRow(s))
    .eq("id", "global");
  if (error) throw error;
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(s)); } catch {/* ignore */}
}
