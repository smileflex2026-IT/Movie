import { useMemo, useState } from "react";
import { Upload, AlertTriangle, CheckCircle2, X, Sparkles, Download } from "lucide-react";
import Modal from "./Modal";
import { Field, inputCls } from "./FormField";
import {
  Movie,
  Category,
  getMovies,
  setMovies,
  generateId,
  makeUniqueSlug,
} from "@/lib/cms-storage";
import { getArtForTitle } from "@/lib/movie-art";
import { findSimilar } from "@/lib/similarity";
import { toast } from "sonner";

interface ParsedRow {
  title: string;
  description: string;
  /** Category id chosen for this row (overrides round-robin). Empty = use distribution. */
  categoryId: string;
  duplicate?: { title: string; score: number };
}

interface BulkImportModalProps {
  open: boolean;
  onClose: () => void;
  categories: Category[];
  /** Called after a successful import so parent can refresh its movie list. */
  onImported: (count: number) => void;
}

const SAMPLE_VIDEO =
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";

/**
 * Parse pasted text. Supports two formats per line, auto-detected:
 *   1. "Title — Description"   (em dash, en dash, or " | ", " - ", ": ")
 *   2. "Title,Description"     (CSV — first comma splits)
 * Lines without a separator are imported with an empty description.
 * Blank lines and lines starting with "#" are skipped.
 */
function parseInput(raw: string, defaultDescription: string): Omit<ParsedRow, "categoryId" | "duplicate">[] {
  const out: Omit<ParsedRow, "categoryId" | "duplicate">[] = [];
  // Split on " — ", " – ", " | ", " - ", " :: ", or first comma. Tested in order.
  const SEPARATORS = [" — ", " – ", " | ", " :: ", " - "];
  const lines = raw.split(/\r?\n/);
  for (let idx = 0; idx < lines.length; idx++) {
    const rawLine = lines[idx];
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    // Skip a CSV header row if present on the very first non-blank line
    if (
      out.length === 0 &&
      /^\s*"?title"?\s*,\s*"?description"?\s*$/i.test(line)
    ) {
      continue;
    }
    let title = line;
    let desc = "";
    let split = false;
    for (const sep of SEPARATORS) {
      const i = line.indexOf(sep);
      if (i > 0) {
        title = line.slice(0, i).trim();
        desc = line.slice(i + sep.length).trim();
        split = true;
        break;
      }
    }
    if (!split) {
      // Try CSV (only if line has a comma and looks CSV-ish)
      const i = line.indexOf(",");
      if (i > 0) {
        title = line.slice(0, i).trim().replace(/^"|"$/g, "");
        desc = line.slice(i + 1).trim().replace(/^"|"$/g, "");
      }
    }
    title = title.replace(/^["'\u201C\u201D]|["'\u201C\u201D]$/g, "").trim();
    if (!title) continue;
    out.push({ title, description: desc || defaultDescription });
  }
  return out;
}

export default function BulkImportModal({ open, onClose, categories, onImported }: BulkImportModalProps) {
  const [text, setText] = useState("");
  const [defaultDescription, setDefaultDescription] = useState("");
  const [selectedCats, setSelectedCats] = useState<string[]>([]);
  const [publishImmediately, setPublishImmediately] = useState(true);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  // Per-row category override map (rowIndex -> categoryId). Empty string = use distribution.
  const [overrides, setOverrides] = useState<Record<number, string>>({});

  // Static categories only — virtual rails (Top 10, Continue Watching, Favorites) compute at runtime.
  const importableCats = useMemo(
    () => categories.filter((c) => !c.virtual).sort((a, b) => a.order - b.order),
    [categories],
  );

  const reset = () => {
    setText("");
    setDefaultDescription("");
    setSelectedCats([]);
    setPublishImmediately(true);
    setSkipDuplicates(true);
    setOverrides({});
  };

  const close = () => { reset(); onClose(); };

  /** Build and trigger download of a CSV template with example rows. */
  const downloadTemplate = () => {
    const csv =
      "Title,Description\n" +
      "\"Oppenheimer\",\"A biopic of the man behind the atomic bomb.\"\n" +
      "\"Dune: Part Two\",\"Paul Atreides unites with the Fremen.\"\n" +
      "\"Wednesday\",\"A young Addams enrolls at Nevermore Academy.\"\n";
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "smileflex-bulk-import-template.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Template downloaded");
  };

  const parsedRaw = useMemo(() => parseInput(text, defaultDescription), [text, defaultDescription]);

  // Round-robin distribute across selected categories, then check for catalog duplicates.
  const rows = useMemo<ParsedRow[]>(() => {
    const existing = getMovies();
    return parsedRaw.map((r, i) => {
      const auto = selectedCats.length
        ? selectedCats[i % selectedCats.length]
        : "";
      const categoryId = overrides[i] ?? auto;
      const matches = findSimilar(r.title, existing, { threshold: 0.85, limit: 1 });
      const dup = matches[0]
        ? { title: matches[0].item.title, score: matches[0].score }
        : undefined;
      return { ...r, categoryId, duplicate: dup };
    });
  }, [parsedRaw, selectedCats, overrides]);

  const dupCount = rows.filter((r) => r.duplicate).length;
  const missingCatCount = rows.filter((r) => !r.categoryId).length;
  const importableCount = rows.length - (skipDuplicates ? dupCount : 0) - missingCatCount;

  const toggleCat = (id: string) =>
    setSelectedCats((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const setRowCategory = (index: number, categoryId: string) =>
    setOverrides((prev) => ({ ...prev, [index]: categoryId }));

  const runImport = () => {
    if (!rows.length) return toast.error("Nothing to import — paste some titles first");
    if (selectedCats.length === 0 && rows.every((r) => !r.categoryId)) {
      return toast.error("Pick at least one target category");
    }

    const existing = getMovies();
    const next: Movie[] = [...existing];
    const now = new Date().toISOString();
    let added = 0;
    let skipped = 0;

    for (const r of rows) {
      if (!r.categoryId) { skipped++; continue; }
      if (skipDuplicates && r.duplicate) { skipped++; continue; }
      const id = generateId();
      const slug = makeUniqueSlug(r.title, next);
      const art = getArtForTitle(r.title);
      next.push({
        id,
        title: r.title,
        slug,
        description: r.description,
        poster: art.poster,
        backdrop: art.backdrop,
        video: SAMPLE_VIDEO,
        duration: 90,
        categoryId: r.categoryId,
        published: publishImmediately,
        ads: [],
        createdAt: now,
        year: new Date().getFullYear(),
        rating: 0,
        featured: false,
        badge: "",
      });
      added++;
    }

    setMovies(next);
    // Notify same-tab listeners (e.g. open Home tab) so rails refresh instantly.
    try {
      window.dispatchEvent(new StorageEvent("storage", { key: "smileflex_movies" }));
    } catch {
      window.dispatchEvent(new Event("storage"));
    }

    toast.success(
      `Imported ${added} movie${added === 1 ? "" : "s"}` +
        (skipped ? ` · ${skipped} skipped` : ""),
    );
    onImported(added);
    close();
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title="Bulk Import Movies"
      maxWidth="max-w-4xl"
      footer={
        <>
          <button onClick={close} className="px-5 py-2.5 rounded-xl bg-secondary hover:bg-secondary/70 font-medium transition-colors">
            Cancel
          </button>
          <button
            onClick={runImport}
            disabled={importableCount <= 0}
            className="px-5 py-2.5 rounded-xl gradient-brand text-primary-foreground font-semibold flex items-center gap-2 hover:shadow-glow transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none"
          >
            <Upload className="w-4 h-4" /> Import {importableCount > 0 ? importableCount : ""}
          </button>
        </>
      }
    >
      <div className="space-y-5">
        {/* Step 1 — paste */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium">
              Paste titles{" "}
              <span className="text-muted-foreground font-normal">
                (one per line — supports <code className="text-xs">Title — Description</code> or CSV)
              </span>
            </label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={downloadTemplate}
                className="text-xs flex items-center gap-1 text-primary-glow hover:text-primary transition-colors"
                title="Download a CSV template you can fill in and paste back here"
              >
                <Download className="w-3 h-3" /> CSV template
              </button>
              <span className="text-xs text-muted-foreground">{parsedRaw.length} parsed</span>
            </div>
          </div>
          <textarea
            value={text}
            onChange={(e) => { setText(e.target.value); setOverrides({}); }}
            rows={8}
            placeholder={`Oppenheimer — A biopic of the man behind the atomic bomb.\nDune: Part Two — Paul Atreides unites with the Fremen.\nWednesday, A young Addams enrolls at Nevermore Academy.\n# Lines starting with # are ignored`}
            className={`${inputCls} font-mono text-sm leading-relaxed`}
            spellCheck={false}
          />
        </div>

        <Field label="Default description (used when a row has no description)">
          <input
            className={inputCls}
            value={defaultDescription}
            onChange={(e) => setDefaultDescription(e.target.value)}
            placeholder="A new release on SmileFlex."
            maxLength={500}
          />
        </Field>

        {/* Step 2 — categories */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium">
              Target categories{" "}
              <span className="text-muted-foreground font-normal">
                (pick one or many — titles are distributed round-robin)
              </span>
            </label>
            {selectedCats.length > 0 && (
              <button
                onClick={() => { setSelectedCats([]); setOverrides({}); }}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Clear
              </button>
            )}
          </div>
          {importableCats.length === 0 ? (
            <p className="text-xs text-muted-foreground p-3 rounded-lg bg-secondary/30 border border-border">
              No static categories available. Create one in Categories first.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-3 rounded-xl bg-secondary/30 border border-border">
              {importableCats.map((c) => {
                const on = selectedCats.includes(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => { toggleCat(c.id); setOverrides({}); }}
                    className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors border ${
                      on
                        ? "bg-primary/20 text-primary-glow border-primary/50"
                        : "bg-background/40 text-muted-foreground border-border hover:text-foreground"
                    }`}
                  >
                    {c.name}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Options */}
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="flex items-start gap-3 p-3 rounded-lg bg-secondary/30 border border-border cursor-pointer">
            <input
              type="checkbox"
              checked={publishImmediately}
              onChange={(e) => setPublishImmediately(e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-primary"
            />
            <div>
              <div className="text-sm font-medium">Publish immediately</div>
              <div className="text-xs text-muted-foreground">If off, imports start as drafts.</div>
            </div>
          </label>
          <label className="flex items-start gap-3 p-3 rounded-lg bg-secondary/30 border border-border cursor-pointer">
            <input
              type="checkbox"
              checked={skipDuplicates}
              onChange={(e) => setSkipDuplicates(e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-primary"
            />
            <div>
              <div className="text-sm font-medium">Skip likely duplicates</div>
              <div className="text-xs text-muted-foreground">Rows that look 85%+ similar to existing titles.</div>
            </div>
          </label>
        </div>

        {/* Preview */}
        {rows.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium">Preview</h3>
              <div className="text-xs text-muted-foreground flex items-center gap-3">
                <span className="flex items-center gap-1 text-success"><CheckCircle2 className="w-3 h-3" /> {importableCount} ready</span>
                {dupCount > 0 && <span className="flex items-center gap-1 text-warning"><AlertTriangle className="w-3 h-3" /> {dupCount} duplicate</span>}
                {missingCatCount > 0 && <span className="flex items-center gap-1 text-destructive"><X className="w-3 h-3" /> {missingCatCount} no category</span>}
              </div>
            </div>
            <div className="rounded-xl border border-border overflow-hidden max-h-72 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-secondary/50 text-xs text-muted-foreground sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium w-8">#</th>
                    <th className="px-3 py-2 text-left font-medium">Title</th>
                    <th className="px-3 py-2 text-left font-medium">Category</th>
                    <th className="px-3 py-2 text-left font-medium w-32">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => {
                    const skipped = (skipDuplicates && r.duplicate) || !r.categoryId;
                    return (
                      <tr key={i} className={`border-t border-border ${skipped ? "opacity-60" : ""}`}>
                        <td className="px-3 py-2 text-muted-foreground tabular-nums">{i + 1}</td>
                        <td className="px-3 py-2">
                          <div className="font-medium truncate max-w-[260px]">{r.title}</div>
                          {r.description && (
                            <div className="text-xs text-muted-foreground truncate max-w-[260px]">{r.description}</div>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <select
                            value={r.categoryId}
                            onChange={(e) => setRowCategory(i, e.target.value)}
                            className="text-xs px-2 py-1 rounded bg-background border border-border focus:border-primary focus:outline-none max-w-[180px]"
                          >
                            <option value="">— pick —</option>
                            {importableCats.map((c) => (
                              <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          {!r.categoryId ? (
                            <span className="text-xs text-destructive flex items-center gap-1">
                              <X className="w-3 h-3" /> No category
                            </span>
                          ) : r.duplicate ? (
                            <span
                              className="text-xs text-warning flex items-center gap-1"
                              title={`Looks like "${r.duplicate.title}" (${Math.round(r.duplicate.score * 100)}%)`}
                            >
                              <AlertTriangle className="w-3 h-3" /> {skipDuplicates ? "Will skip" : "Duplicate"}
                            </span>
                          ) : (
                            <span className="text-xs text-success flex items-center gap-1">
                              <Sparkles className="w-3 h-3" /> Ready
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
