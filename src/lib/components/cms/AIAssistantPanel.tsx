import { useState } from "react";
import { Sparkles, RefreshCw, Tags, X, Loader2, Check, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Movie, Category } from "@/lib/cms-storage";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onClose: () => void;
  draft: Movie;
  categories: Category[];
  onApply: (patch: Partial<Movie>) => void;
}

type Action = "generate_metadata" | "refresh_metadata" | "categorize";

interface MetaResult {
  description?: string;
  year?: number;
  duration?: number;
  rating?: number;
  genres?: string[];
  cast_list?: string[];
  director?: string;
  country?: string;
  language?: string;
  content_rating?: string;
  badge?: string;
}

interface CategorySuggestion {
  category_id: string;
  confidence: number;
  reason?: string;
}

export default function AIAssistantPanel({ open, onClose, draft, categories, onApply }: Props) {
  const [busy, setBusy] = useState<Action | null>(null);
  const [log, setLog] = useState<{ kind: "info" | "result"; text: string }[]>([]);
  const [suggestions, setSuggestions] = useState<CategorySuggestion[]>([]);

  if (!open) return null;

  const append = (kind: "info" | "result", text: string) =>
    setLog((l) => [...l, { kind, text }]);

  const call = async (action: Action) => {
    setBusy(action);
    append("info", `→ ${action.replace("_", " ")}…`);
    try {
      const { data, error } = await supabase.functions.invoke("cms-ai-assistant", {
        body: {
          action,
          title: draft.title,
          current: {
            title: draft.title,
            description: draft.description,
            year: draft.year,
            duration: draft.duration,
            rating: draft.rating,
            badge: draft.badge,
          },
          categories: categories.map((c) => ({ id: c.id, name: c.name })),
        },
      });
      if (error) throw error;
      const res = (data as { result?: Record<string, unknown>; error?: string }) || {};
      if (res.error) throw new Error(res.error);
      const r = res.result || {};

      if (action === "categorize") {
        const raw = Array.isArray((r as { suggestions?: unknown }).suggestions)
          ? ((r as { suggestions: CategorySuggestion[] }).suggestions)
          : [];
        const validIds = new Set(categories.map((c) => c.id));
        const cleaned = raw
          .filter((s) => s && validIds.has(String(s.category_id)))
          .map((s) => ({
            category_id: String(s.category_id),
            confidence: Math.max(0, Math.min(1, Number(s.confidence) || 0)),
            reason: s.reason,
          }))
          .sort((a, b) => b.confidence - a.confidence)
          .slice(0, 5);
        setSuggestions(cleaned);
        append("result", cleaned.length ? `Got ${cleaned.length} category suggestion${cleaned.length === 1 ? "" : "s"} — review below.` : "No valid suggestions.");
        if (!cleaned.length) toast.error("No valid suggestions returned");
      } else {
        const m = r as MetaResult;
        const patch: Partial<Movie> = {};
        if (m.description) patch.description = m.description;
        if (m.year) patch.year = m.year;
        if (m.duration) patch.duration = m.duration;
        if (typeof m.rating === "number") patch.rating = m.rating;
        if (m.badge !== undefined) patch.badge = m.badge;
        onApply(patch);
        append("result", `Updated: ${Object.keys(patch).join(", ") || "no fields"}`);
        toast.success(action === "generate_metadata" ? "Metadata generated" : "Metadata refreshed");
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Request failed";
      append("info", `⚠ ${msg}`);
      toast.error(msg);
    } finally {
      setBusy(null);
    }
  };

  const Btn = ({ action, icon: Icon, label, hint }: { action: Action; icon: typeof Sparkles; label: string; hint: string }) => (
    <button
      onClick={() => call(action)}
      disabled={!!busy || !draft.title.trim()}
      className="w-full text-left p-4 rounded-xl border border-border bg-input hover:border-primary/60 hover:bg-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <div className="flex items-center gap-3 mb-1">
        {busy === action ? <Loader2 className="w-4 h-4 animate-spin text-primary-glow" /> : <Icon className="w-4 h-4 text-primary-glow" />}
        <span className="font-semibold text-sm">{label}</span>
      </div>
      <p className="text-xs text-muted-foreground">{hint}</p>
    </button>
  );

  return (
    <aside className="fixed top-0 right-0 h-screen w-[380px] z-[60] glass border-l border-border flex flex-col animate-fade-in">
      <header className="p-5 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg gradient-brand flex items-center justify-center shadow-glow">
            <Sparkles className="w-4 h-4 text-primary-foreground" />
          </div>
          <div>
            <h3 className="font-bold text-sm">AI Assistant</h3>
            <p className="text-[11px] text-muted-foreground">Metadata & categorization</p>
          </div>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
      </header>

      <div className="p-5 space-y-3">
        <div className="text-xs text-muted-foreground">
          Working on: <span className="text-foreground font-medium">{draft.title || "(untitled)"}</span>
        </div>
        <Btn action="generate_metadata" icon={Sparkles} label="Generate full metadata" hint="Build a fresh synopsis, year, runtime, rating, badge from the title." />
        <Btn action="refresh_metadata" icon={RefreshCw} label="Refresh metadata" hint="Improve weak fields and fill gaps without overwriting good values." />
        <Btn action="categorize" icon={Tags} label="Auto-categorize" hint="Pick the best matching CMS category." />
      </div>

      <div className="flex-1 overflow-y-auto p-5 pt-0">
        {suggestions.length > 0 && (
          <div className="mb-5">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2 flex items-center justify-between">
              <span>Category suggestions</span>
              <button onClick={() => setSuggestions([])} className="text-muted-foreground hover:text-foreground normal-case tracking-normal">Dismiss all</button>
            </div>
            <ul className="space-y-2">
              {suggestions.map((s) => {
                const cat = categories.find((c) => c.id === s.category_id);
                if (!cat) return null;
                const pct = Math.round(s.confidence * 100);
                const tone = pct >= 75 ? "bg-success" : pct >= 45 ? "bg-primary-glow" : "bg-warning";
                const isActive = draft.categoryId === cat.id;
                return (
                  <li key={s.category_id} className="p-3 rounded-xl border border-border bg-input/60">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-sm font-semibold truncate">{cat.name}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground font-mono">{pct}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-secondary overflow-hidden mb-2">
                      <div className={`h-full ${tone}`} style={{ width: `${pct}%` }} />
                    </div>
                    {s.reason && <p className="text-[11px] text-muted-foreground mb-2">{s.reason}</p>}
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          onApply({ categoryId: cat.id });
                          setSuggestions((list) => list.filter((x) => x.category_id !== s.category_id));
                          append("result", `Accepted: ${cat.name}`);
                          toast.success(`Set category to ${cat.name}`);
                        }}
                        disabled={isActive}
                        className="flex-1 text-xs px-3 py-1.5 rounded-lg gradient-brand text-primary-foreground font-medium flex items-center justify-center gap-1.5 disabled:opacity-50"
                      >
                        <Check className="w-3.5 h-3.5" /> {isActive ? "Current" : "Accept"}
                      </button>
                      <button
                        onClick={() => {
                          setSuggestions((list) => list.filter((x) => x.category_id !== s.category_id));
                          append("info", `Rejected: ${cat.name}`);
                        }}
                        className="text-xs px-3 py-1.5 rounded-lg bg-secondary hover:bg-secondary/70 text-foreground font-medium flex items-center justify-center gap-1.5"
                      >
                        <XCircle className="w-3.5 h-3.5" /> Reject
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">Activity</div>
        {log.length === 0 ? (
          <p className="text-xs text-muted-foreground">No actions yet.</p>
        ) : (
          <ul className="space-y-2">
            {log.map((e, i) => (
              <li key={i} className={`text-xs p-2 rounded-lg ${e.kind === "result" ? "bg-primary/10 text-primary-glow" : "bg-secondary/50 text-muted-foreground"}`}>
                {e.text}
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}
