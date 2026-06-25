
-- 1. Per-category virtual flag
ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS virtual boolean NOT NULL DEFAULT false;

-- Default the two known virtual rails to true on existing data
UPDATE public.categories SET virtual = true WHERE top_ten = true OR slug = 'continue';

-- 2. Global rail settings (single-row config, keyed by id='global')
CREATE TABLE IF NOT EXISTS public.rail_settings (
  id text PRIMARY KEY DEFAULT 'global',
  top10_weight_manual_rank numeric NOT NULL DEFAULT 1.0,
  top10_weight_play_count numeric NOT NULL DEFAULT 1.0,
  top10_weight_recency numeric NOT NULL DEFAULT 0.5,
  top10_recency_half_life_days integer NOT NULL DEFAULT 7,
  continue_max_items integer NOT NULL DEFAULT 20,
  continue_sort text NOT NULL DEFAULT 'recent', -- 'recent' | 'most_played'
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT rail_settings_singleton CHECK (id = 'global'),
  CONSTRAINT rail_settings_continue_sort CHECK (continue_sort IN ('recent','most_played'))
);

ALTER TABLE public.rail_settings ENABLE ROW LEVEL SECURITY;

-- Anyone (including unauthenticated visitors) can read the global config
DROP POLICY IF EXISTS "Anyone can view rail settings" ON public.rail_settings;
CREATE POLICY "Anyone can view rail settings"
  ON public.rail_settings FOR SELECT
  TO public
  USING (true);

-- Only CMS staff (admin/editor) can write
DROP POLICY IF EXISTS "Staff can insert rail settings" ON public.rail_settings;
CREATE POLICY "Staff can insert rail settings"
  ON public.rail_settings FOR INSERT
  TO authenticated
  WITH CHECK (public.is_cms_staff(auth.uid()));

DROP POLICY IF EXISTS "Staff can update rail settings" ON public.rail_settings;
CREATE POLICY "Staff can update rail settings"
  ON public.rail_settings FOR UPDATE
  TO authenticated
  USING (public.is_cms_staff(auth.uid()));

-- updated_at trigger
DROP TRIGGER IF EXISTS rail_settings_touch ON public.rail_settings;
CREATE TRIGGER rail_settings_touch
  BEFORE UPDATE ON public.rail_settings
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Seed the singleton row
INSERT INTO public.rail_settings (id) VALUES ('global')
  ON CONFLICT (id) DO NOTHING;
