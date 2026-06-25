
-- =========================================================================
-- ENUMS
-- =========================================================================
CREATE TYPE public.app_role AS ENUM ('admin', 'editor');

-- =========================================================================
-- USER ROLES (separate table — never store roles on profile/users tables)
-- =========================================================================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security-definer role check (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Convenience: is the caller a CMS staff member (admin OR editor)?
CREATE OR REPLACE FUNCTION public.is_cms_staff(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin', 'editor')
  )
$$;

CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert roles"
  ON public.user_roles FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update roles"
  ON public.user_roles FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete roles"
  ON public.user_roles FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- =========================================================================
-- CATEGORIES
-- =========================================================================
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  "order" INTEGER NOT NULL DEFAULT 0,
  top_ten BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view categories"
  ON public.categories FOR SELECT
  USING (true);

CREATE POLICY "Staff can insert categories"
  ON public.categories FOR INSERT
  TO authenticated
  WITH CHECK (public.is_cms_staff(auth.uid()));

CREATE POLICY "Staff can update categories"
  ON public.categories FOR UPDATE
  TO authenticated
  USING (public.is_cms_staff(auth.uid()));

CREATE POLICY "Staff can delete categories"
  ON public.categories FOR DELETE
  TO authenticated
  USING (public.is_cms_staff(auth.uid()));

-- =========================================================================
-- MOVIES
-- =========================================================================
CREATE TABLE public.movies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  poster TEXT NOT NULL DEFAULT '',
  backdrop TEXT NOT NULL DEFAULT '',
  video TEXT NOT NULL DEFAULT '',
  duration INTEGER NOT NULL DEFAULT 0,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  published BOOLEAN NOT NULL DEFAULT false,
  ads JSONB NOT NULL DEFAULT '[]'::jsonb,
  year INTEGER,
  rating NUMERIC(3,1),
  featured BOOLEAN NOT NULL DEFAULT false,
  badge TEXT,
  weekly_trending_rank INTEGER,
  -- Extended metadata
  genres TEXT[] NOT NULL DEFAULT '{}',
  language TEXT,
  country TEXT,
  director TEXT,
  cast_list TEXT[] NOT NULL DEFAULT '{}',
  release_date DATE,
  content_rating TEXT,
  -- Subtitles: array of { language, label, url, format } where format in ('vtt','srt')
  subtitles JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- AI-generated preview clip timestamps: array of { start, end, label }
  preview_clips JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_movies_category ON public.movies(category_id);
CREATE INDEX idx_movies_published ON public.movies(published);
CREATE INDEX idx_movies_featured ON public.movies(featured) WHERE featured = true;
CREATE INDEX idx_movies_top_ten_rank ON public.movies(weekly_trending_rank) WHERE weekly_trending_rank IS NOT NULL;

ALTER TABLE public.movies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view published movies"
  ON public.movies FOR SELECT
  USING (published = true OR public.is_cms_staff(auth.uid()));

CREATE POLICY "Staff can insert movies"
  ON public.movies FOR INSERT
  TO authenticated
  WITH CHECK (public.is_cms_staff(auth.uid()));

CREATE POLICY "Staff can update movies"
  ON public.movies FOR UPDATE
  TO authenticated
  USING (public.is_cms_staff(auth.uid()));

CREATE POLICY "Staff can delete movies"
  ON public.movies FOR DELETE
  TO authenticated
  USING (public.is_cms_staff(auth.uid()));

-- =========================================================================
-- PLAY COUNTS
-- =========================================================================
CREATE TABLE public.play_counts (
  movie_id UUID PRIMARY KEY REFERENCES public.movies(id) ON DELETE CASCADE,
  count INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.play_counts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view play counts"
  ON public.play_counts FOR SELECT
  USING (true);

-- Atomic increment via security-definer RPC (anyone can call, but only this fn writes)
CREATE OR REPLACE FUNCTION public.increment_play_count(_movie_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.play_counts (movie_id, count, updated_at)
  VALUES (_movie_id, 1, now())
  ON CONFLICT (movie_id) DO UPDATE
    SET count = public.play_counts.count + 1,
        updated_at = now();
END;
$$;

CREATE POLICY "Admins can reset play counts"
  ON public.play_counts FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete play counts"
  ON public.play_counts FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- =========================================================================
-- updated_at TRIGGERS
-- =========================================================================
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_categories_touch BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_movies_touch BEFORE UPDATE ON public.movies
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- =========================================================================
-- STORAGE BUCKETS
-- =========================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('posters', 'posters', true),
  ('backdrops', 'backdrops', true),
  ('videos', 'videos', true),
  ('subtitles', 'subtitles', true)
ON CONFLICT (id) DO NOTHING;

-- Public read for all four buckets
CREATE POLICY "Public can view posters"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'posters');

CREATE POLICY "Public can view backdrops"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'backdrops');

CREATE POLICY "Public can view videos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'videos');

CREATE POLICY "Public can view subtitles"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'subtitles');

-- Staff-only write/update/delete for all four buckets
CREATE POLICY "Staff can upload media"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id IN ('posters','backdrops','videos','subtitles')
    AND public.is_cms_staff(auth.uid())
  );

CREATE POLICY "Staff can update media"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id IN ('posters','backdrops','videos','subtitles')
    AND public.is_cms_staff(auth.uid())
  );

CREATE POLICY "Staff can delete media"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id IN ('posters','backdrops','videos','subtitles')
    AND public.is_cms_staff(auth.uid())
  );

-- =========================================================================
-- AUTO-PROMOTE FIRST USER TO ADMIN (so the CMS is usable out of the box)
-- =========================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- First user to sign up becomes admin; everyone after gets editor.
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'editor');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_role();
