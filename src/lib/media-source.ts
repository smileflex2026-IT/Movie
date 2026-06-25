/**
 * Local-first media source resolver.
 *
 * The CMS stores a "Video URL" per movie. In a typical offline deployment the
 * actual files live on a local drive (a folder served by the same host, a LAN
 * file server, or even a `file://` mount). To keep the CMS portable we let
 * editors enter either:
 *
 *   • a full URL              — used as-is (http://, https://, blob:, data:, file://)
 *   • an absolute path        — used as-is ("/media/oppenheimer.mp4")
 *   • a bare filename / path  — joined to the configured local media base
 *                                ("oppenheimer.mp4" → "<base>/oppenheimer.mp4")
 *
 * The base is configured once per device and persisted in localStorage so the
 * same content library can be repointed (USB drive, NAS, LAN server) without
 * editing every movie record.
 */

const KEY = "smileflex_media_base";

/** Default base assumes files are dropped into `public/media/` so Vite serves them at `/media/…`. */
export const DEFAULT_MEDIA_BASE = "/media/";

export const getMediaBase = (): string => {
  try {
    return localStorage.getItem(KEY) ?? DEFAULT_MEDIA_BASE;
  } catch {
    return DEFAULT_MEDIA_BASE;
  }
};

export const setMediaBase = (base: string) => {
  const cleaned = base.trim();
  try {
    if (!cleaned) localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, cleaned);
    // Notify same-tab listeners (the storage event only fires cross-tab).
    window.dispatchEvent(new Event("smileflex:media-base"));
  } catch {
    /* ignore */
  }
};

const ABSOLUTE_RE = /^(https?:|blob:|data:|file:|\/\/)/i;

/** Resolve a stored video value into a fetchable URL for the player. */
export const resolveMediaUrl = (input: string | undefined | null, base = getMediaBase()): string => {
  const v = (input ?? "").trim();
  if (!v) return "";
  if (ABSOLUTE_RE.test(v)) return v;
  if (v.startsWith("/")) return v; // already an absolute site path
  const b = base || DEFAULT_MEDIA_BASE;
  return `${b.replace(/\/+$/, "")}/${v.replace(/^\/+/, "")}`;
};

/** True when the stored value is a bare relative path that will be joined to the base. */
export const isLocalRelative = (input: string | undefined | null): boolean => {
  const v = (input ?? "").trim();
  if (!v) return false;
  return !ABSOLUTE_RE.test(v) && !v.startsWith("/");
};