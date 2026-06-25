
-- Pin search_path on the two functions the linter flagged.
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'editor');
  END IF;
  RETURN NEW;
END;
$$;

-- Replace the broad public SELECT policies on storage.objects with staff-only listing.
-- Public read of individual files still works via the public CDN URL (bucket.public = true).
DROP POLICY IF EXISTS "Public can view posters" ON storage.objects;
DROP POLICY IF EXISTS "Public can view backdrops" ON storage.objects;
DROP POLICY IF EXISTS "Public can view videos" ON storage.objects;
DROP POLICY IF EXISTS "Public can view subtitles" ON storage.objects;

CREATE POLICY "Staff can list media"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id IN ('posters','backdrops','videos','subtitles')
    AND public.is_cms_staff(auth.uid())
  );
