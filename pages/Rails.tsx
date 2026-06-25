import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Save, RotateCcw, Sliders, Sparkles, Clock, Hash, Activity } from "lucide-react";
import { toast } from "sonner";
import DashboardLayout from "@/components/cms/DashboardLayout";
import {
  RailSettings,
  DEFAULT_RAIL_SETTINGS,
  fetchRailSettings,
  saveRailSettings,
  getCachedRailSettings,
} from "@/lib/rail-settings";
import { getCategories, Category } from "@/lib/cms-storage";

function WeightSlider({
  label,
  description,
  icon: Icon,
  value,
  onChange,
  min = 0,
  max = 2,
  step = 0.1,
  total,
}: {
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  total: number;
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="p-4 rounded-xl bg-secondary/30 border border-border space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/15 text-primary-glow flex items-center justify-center shrink-0">
            <Icon className="w-4 h-4" />
          </div>
          <div>
            <div className="font-medium text-sm">{label}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{description}</div>
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-lg font-semibold tabular-nums">{value.toFixed(1)}</div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{pct}% influence</div>
        </div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-primary"
      />
    </div>
  );
}

export default function RailsPage() {
  const [settings, setSettings] = useState<RailSettings>(getCachedRailSettings);
  const [original, setOriginal] = useState<RailSettings>(getCachedRailSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cats, setCats] = useState<Category[]>([]);

  useEffect(() => {
    setCats([...getCategories()].sort((a, b) => a.order - b.order));
    fetchRailSettings()
      .then((s) => { setSettings(s); setOriginal(s); })
      .finally(() => setLoading(false));
  }, []);

  const dirty = useMemo(() => JSON.stringify(settings) !== JSON.stringify(original), [settings, original]);
  const totalWeight =
    settings.top10WeightManualRank + settings.top10WeightPlayCount + settings.top10WeightRecency;

  const virtualRails = cats.filter((c) => c.virtual);
  const topTenRail = cats.find((c) => c.topTen && c.virtual);
  const continueRail = cats.find((c) => c.slug === "continue" && c.virtual);

  const save = async () => {
    setSaving(true);
    try {
      await saveRailSettings(settings);
      setOriginal(settings);
      toast.success("Rail settings saved");
    } catch (e) {
      const msg = (e as { message?: string })?.message ?? "Failed to save";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const reset = () => {
    setSettings(DEFAULT_RAIL_SETTINGS);
    toast.info("Reverted to defaults — click Save to apply");
  };

  return (
    <DashboardLayout>
      <header className="flex items-start justify-between mb-8 gap-4 flex-wrap">
        <div>
          <Link to="/cms/categories" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-2">
            <ArrowLeft className="w-3 h-3" /> Back to Categories
          </Link>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Sliders className="w-7 h-7 text-primary-glow" /> Rail Settings
          </h1>
          <p className="text-muted-foreground mt-1">
            Configure how virtual rails (Top 10, Continue Watching) are ranked on the homepage.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={reset}
            className="px-4 py-2.5 rounded-xl bg-secondary hover:bg-secondary/70 font-medium flex items-center gap-2 transition-colors text-sm"
          >
            <RotateCcw className="w-4 h-4" /> Reset to defaults
          </button>
          <button
            onClick={save}
            disabled={!dirty || saving}
            className="px-5 py-2.5 rounded-xl gradient-brand text-primary-foreground font-semibold flex items-center gap-2 hover:shadow-glow transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none"
          >
            <Save className="w-4 h-4" /> {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </header>

      {/* Active virtual rails summary */}
      <section className="mb-8 p-5 rounded-2xl gradient-card border border-border">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-primary-glow" />
          <h2 className="font-semibold">Active virtual rails</h2>
        </div>
        {virtualRails.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No categories are currently set to virtual.{" "}
            <Link to="/cms/categories" className="underline">Edit a category</Link> and turn on “Virtual rail”.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {virtualRails.map((c) => (
              <span key={c.id} className="text-xs px-3 py-1.5 rounded-lg bg-primary/15 text-primary-glow font-medium">
                {c.name}
              </span>
            ))}
          </div>
        )}
      </section>

      {loading ? (
        <div className="text-center py-16 text-muted-foreground text-sm">Loading settings…</div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Top 10 weighting */}
          <section className={`p-6 rounded-2xl gradient-card border border-border space-y-4 ${!topTenRail ? "opacity-60" : ""}`}>
            <div>
              <h2 className="font-semibold text-lg flex items-center gap-2">
                Top 10 ranking weights
                {!topTenRail && <span className="text-[10px] font-normal text-muted-foreground uppercase tracking-wider">(no virtual Top 10 rail enabled)</span>}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Each weight controls how strongly a signal influences the Top 10 order. Percentages show relative influence.
              </p>
            </div>

            <WeightSlider
              label="Manual trending rank"
              description="Editor-set weeklyTrendingRank on each movie (1 = highest)."
              icon={Hash}
              value={settings.top10WeightManualRank}
              onChange={(v) => setSettings({ ...settings, top10WeightManualRank: v })}
              total={totalWeight}
            />
            <WeightSlider
              label="Play count"
              description="How many times viewers have played the movie."
              icon={Activity}
              value={settings.top10WeightPlayCount}
              onChange={(v) => setSettings({ ...settings, top10WeightPlayCount: v })}
              total={totalWeight}
            />
            <WeightSlider
              label="Recency"
              description="Boost movies played recently (exponential decay)."
              icon={Clock}
              value={settings.top10WeightRecency}
              onChange={(v) => setSettings({ ...settings, top10WeightRecency: v })}
              total={totalWeight}
            />

            <div className="p-4 rounded-xl bg-secondary/30 border border-border">
              <label className="text-sm font-medium">Recency half-life</label>
              <p className="text-xs text-muted-foreground mt-0.5 mb-3">
                A play that happened this many days ago counts for half. Lower = faster decay.
              </p>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={1}
                  max={30}
                  step={1}
                  value={settings.top10RecencyHalfLifeDays}
                  onChange={(e) => setSettings({ ...settings, top10RecencyHalfLifeDays: parseInt(e.target.value, 10) })}
                  className="flex-1 accent-primary"
                />
                <span className="text-sm font-semibold tabular-nums w-16 text-right">
                  {settings.top10RecencyHalfLifeDays} day{settings.top10RecencyHalfLifeDays === 1 ? "" : "s"}
                </span>
              </div>
            </div>

            {totalWeight === 0 && (
              <p className="text-xs text-warning">
                ⚠ All weights are 0 — the rail will fall back to insertion order.
              </p>
            )}
          </section>

          {/* Continue Watching */}
          <section className={`p-6 rounded-2xl gradient-card border border-border space-y-4 ${!continueRail ? "opacity-60" : ""}`}>
            <div>
              <h2 className="font-semibold text-lg flex items-center gap-2">
                Continue Watching
                {!continueRail && <span className="text-[10px] font-normal text-muted-foreground uppercase tracking-wider">(no virtual Continue Watching rail enabled)</span>}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                How each viewer's “keep watching” rail is built from their personal play history.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-secondary/30 border border-border">
              <label className="text-sm font-medium">Maximum items shown</label>
              <div className="flex items-center gap-3 mt-3">
                <input
                  type="range"
                  min={5}
                  max={50}
                  step={1}
                  value={settings.continueMaxItems}
                  onChange={(e) => setSettings({ ...settings, continueMaxItems: parseInt(e.target.value, 10) })}
                  className="flex-1 accent-primary"
                />
                <span className="text-sm font-semibold tabular-nums w-16 text-right">{settings.continueMaxItems}</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-secondary/30 border border-border">
              <label className="text-sm font-medium block mb-3">Sort order</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { v: "recent", label: "Most recent", desc: "Last played first" },
                  { v: "most_played", label: "Most played", desc: "Highest play count first" },
                ].map((opt) => (
                  <button
                    key={opt.v}
                    onClick={() => setSettings({ ...settings, continueSort: opt.v as RailSettings["continueSort"] })}
                    className={`p-3 rounded-lg text-left transition-colors border ${
                      settings.continueSort === opt.v
                        ? "border-primary bg-primary/15 text-primary-glow"
                        : "border-border bg-secondary/30 hover:bg-secondary/60"
                    }`}
                  >
                    <div className="text-sm font-medium">{opt.label}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{opt.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          </section>
        </div>
      )}
    </DashboardLayout>
  );
}
