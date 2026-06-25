/**
 * Cross-device sync for the CMS category (rail) order, keyed by login email.
 *
 * The app's logins are still local (see auth-context.tsx), so we treat the
 * email as the sync key. On login we pull the saved order from the cloud and
 * apply it locally; every reorder pushes a fresh snapshot back up so any
 * other device with the same login picks it up on next sign-in.
 */
import { supabase } from "@/integrations/supabase/client";
import { getCategories, setCategories, type Category } from "./cms-storage";

const TABLE = "user_category_order";

/** Reorder local categories to match `orderedIds`, keeping any new ones at the end. */
export const applyOrderedIds = (orderedIds: string[]): Category[] => {
  const cats = getCategories();
  if (orderedIds.length === 0) return cats;
  const byId = new Map(cats.map((c) => [c.id, c]));
  const seen = new Set<string>();
  const next: Category[] = [];
  for (const id of orderedIds) {
    const c = byId.get(id);
    if (c && !seen.has(id)) {
      next.push(c);
      seen.add(id);
    }
  }
  for (const c of cats) if (!seen.has(c.id)) next.push(c);
  // Re-normalize the order field to 1..N.
  return next.map((c, i) => ({ ...c, order: i + 1 }));
};

/** Pull the cloud-saved order for this email and apply it locally. */
export const pullCategoryOrder = async (email: string): Promise<boolean> => {
  if (!email) return false;
  const key = email.toLowerCase();
  const { data, error } = await supabase
    .from(TABLE)
    .select("ordered_ids")
    .eq("email", key)
    .maybeSingle();
  if (error || !data?.ordered_ids?.length) return false;
  const next = applyOrderedIds(data.ordered_ids);
  setCategories(next);
  try {
    window.dispatchEvent(new StorageEvent("storage", { key: "smileflex_categories" }));
  } catch {
    window.dispatchEvent(new Event("storage"));
  }
  return true;
};

/** Push the given ordered category id list to the cloud for this email. */
export const pushCategoryOrder = async (email: string, orderedIds: string[]): Promise<void> => {
  if (!email) return;
  const key = email.toLowerCase();
  await supabase
    .from(TABLE)
    .upsert({ email: key, ordered_ids: orderedIds, updated_at: new Date().toISOString() }, { onConflict: "email" });
};