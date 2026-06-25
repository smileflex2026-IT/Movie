CREATE TABLE public.user_category_order (
  email text PRIMARY KEY,
  ordered_ids text[] NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_category_order TO anon, authenticated;
GRANT ALL ON public.user_category_order TO service_role;
ALTER TABLE public.user_category_order ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read category order"
  ON public.user_category_order FOR SELECT
  USING (true);
CREATE POLICY "Anyone can upsert category order"
  ON public.user_category_order FOR INSERT
  WITH CHECK (true);
CREATE POLICY "Anyone can update category order"
  ON public.user_category_order FOR UPDATE
  USING (true) WITH CHECK (true);
CREATE TRIGGER user_category_order_touch
  BEFORE UPDATE ON public.user_category_order
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();