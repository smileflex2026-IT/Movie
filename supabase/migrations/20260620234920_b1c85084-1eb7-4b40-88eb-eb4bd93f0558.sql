CREATE POLICY "Public can upload media"
  ON storage.objects FOR INSERT
  TO anon
  WITH CHECK (bucket_id = ANY (ARRAY['posters','backdrops','videos','subtitles']));

CREATE POLICY "Public can read media"
  ON storage.objects FOR SELECT
  TO anon
  USING (bucket_id = ANY (ARRAY['posters','backdrops','videos','subtitles']));

CREATE POLICY "Public can update media"
  ON storage.objects FOR UPDATE
  TO anon
  USING (bucket_id = ANY (ARRAY['posters','backdrops','videos','subtitles']))
  WITH CHECK (bucket_id = ANY (ARRAY['posters','backdrops','videos','subtitles']));